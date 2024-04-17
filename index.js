const Discord = require('discord.js');
const config = require('./config.json');
const client = new Discord.Client({
    intents: [Discord.GatewayIntentBits.Guilds, Discord.GatewayIntentBits.GuildIntegrations, Discord.GatewayIntentBits.GuildMembers, Discord.GatewayIntentBits.GuildMessages, Discord.GatewayIntentBits.MessageContent],
    makeCache: Discord.Options.cacheWithLimits({
        ...Discord.Options.defaultMakeCacheSettings,
        sweepInterval: 300,
        sweepFilter: Discord.Sweepers.filterByLifetime({
          lifetime: 600,
          getComparisonTimestamp: e => e.editedTimestamp ?? e.createdTimestamp,
        })
    })
});
const phFunction = require('./function/main.js');
const path = require('path');
const moment = require('moment');
const DBL = require('dblapi.js');
const dbl = new DBL(config.dbltoken, client);
const ms = require('ms');
const commandCooldownmap = new Map();
const spamUsersMap = new Map();
const jailWhenSpamGuildCheck = new Map();
const jailWhenJoinGuildCheck = new Map();
module.exports = { jailWhenSpamGuildCheck, jailWhenJoinGuildCheck};

const delay = async (ms) => {
    return new Promise(resolve => {
        setTimeout(resolve, ms);
    });
};

// Database
const mongoose = require('mongoose');
mongoose.Promise = global.Promise;
mongoose.connect(config.mongo_uri, {useNewUrlParser: true, useUnifiedTopology: true, socketTimeoutMS: 360000, connectTimeoutMS: 360000, keepAlive: true, poolSize: 30}).then(console.log("✅ Successful Connected MongoDB !"))

mongoose.connection.on('error', console.error.bind(console, `Connected failure (MongoDB)`));

//profile schema
const blacklist = require('./models/blacklist-profile-schema');
const jailuserlist = require('./models/jailuserlist-profile-schema');
const muteuserlist = require('./models/muteuserlist-profile-schema');
const jailAdmin = require('./models/settings-jailAdmin-schema');
const permissionLevellist = require('./models/permission-profile-schema');
const premiumlist = require('./models/premium-profile-schema');
const premiumcodelist = require('./models/premium-code-profile-schema');
const antispamlist = require('./models/settings-antispam-schema');
const jailrolesfunctionlist = require('./models/settings-jailRoles-schema');
const serverSettingslist = require('./models/settings-server-schema');
const jailwhenjoinlist = require('./models/settings-jailWhenJoin-schema');

const { REST, RequestManager, Routes} = require('discord.js');
const fs = require('node:fs');
client.commands = new Discord.Collection();
const commands = [];
const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));

const clientId = config.clientId;

for (const file of commandFiles) {
	const command = require(`./commands/${file}`);
	commands.push(command.data.toJSON());
    client.commands.set(command.data.name, command);
};

const rest = new REST().setToken(config.product_token);
(async () => {
	try {
		console.log(`Started refreshing ${commands.length} application (/) commands.`);
		const data = await rest.put( Routes.applicationCommands(clientId), { body: commands });
		console.log(`Successfully reloaded ${data.length} application (/) commands.`);
	} catch (error) {
		console.error(error);
	}
})();
client.on(Discord.Events.ClientReady, () => {
  client.user.setActivity({name: `Starting.. Please wait`, type: Discord.ActivityType.Watching});
  console.log(`Logged in as ${client.user.tag}! Servers: ${client.guilds.cache.size} | Members: ${client.guilds.cache.reduce((a, b) => a + b.memberCount, 0)}`);
  setTimeout(() => {
    setInterval(() => { /* ทำการเช็ค jailTime */
        jailuserlist.find({ jailTime: { $lt: Date.now() } }).then(async expirePrisoner => {
            expirePrisoner.forEach((allexpireprisoner) => {
                client.shard.broadcastEval(async (client, {guildId}) => {
                    let fetchGuild = client.guilds.cache.get(`${guildId}`);
                    return fetchGuild ? true : false;
                }, {context: {guildId: allexpireprisoner.GuildID}}).then(resultArray => {
                if(!resultArray.includes(true)) {
                    jailuserlist.updateOne(allexpireprisoner, {
                        $unset: {jailTime: allexpireprisoner.jailTime}
                    }).then(() => console.log(`[tempJail $unset] removed jailTime of ${allexpireprisoner.UserID}: Guild == null`))
                    return;
                };
                const unjailEval = async(client, prisonerdb) => {
                    const Discord = require('discord.js');
                    const path = require('path')
                    const jailuserlist = require(path.join(process.cwd() + '/models/jailuserlist-profile-schema'));
                    const serverSettingslist = require(path.join(process.cwd() + '/models/settings-server-schema'));
                    const jailAdmin = require(path.join(process.cwd() + '/models/settings-jailAdmin-schema'));
                    let allexpireprisoner = prisonerdb.prisonerdb;
                    let specguild = allexpireprisoner.GuildID;
                    let guildFetch = client.guilds.cache.get(specguild);
                    if(!guildFetch) return;
                    let userFetch = guildFetch.members.cache.get(allexpireprisoner.UserID);
                    if(!userFetch) {
                        jailuserlist.updateOne(allexpireprisoner, {
                            $unset: {jailTime: allexpireprisoner.jailTime}
                        }).then(() => console.log(`[tempJail $unset] removed jailTime of ${allexpireprisoner.UserID}: User in guild == null`))
                        return;
                    };
                    function sendnofiMessage(msg) {
                        let sendChannel = '';
                        guildFetch.channels.cache.forEach((channel) => {
                            if(channel.permissionsFor(client.user.id).has(Discord.PermissionFlagsBits.SendMessages && Discord.PermissionFlagsBits.ViewChannel && Discord.PermissionFlagsBits.EmbedLinks) && sendChannel == '' && channel.type == Discord.ChannelType.GuildText) {
                                if(sendChannel == '') sendChannel = channel.id;
                            };
                        });
                            try {
                                guildFetch.channels.cache.get(sendChannel).send(msg)
                            } catch(err) {
                                console.log(`Failed sendnofiMessage() due ${err}`)
                            };
                    };
                    try {
                        if(guildFetch.members.cache.get(client.user.id).permissions.has(Discord.PermissionFlagsBits.ManageRoles) == false) {
                            const embed = new Discord.EmbedBuilder()
                             .setTitle(`**Error:** Tempjail`)
                             .setDescription('❌ Sorry, I Don\'t have Permission! `Manage Roles`')
                             .setColor(0xFF0000)
                             .setFooter({text: `execute unjail command for more details.`})
                            sendnofiMessage({embeds: [embed]});
                            jailuserlist.updateOne(allexpireprisoner, {
                                $unset: {jailTime: allexpireprisoner.jailTime}
                            }).then(console.log(`[timeJail $unset] removed jailTime of ${allexpireprisoner.UserID} in ${specguild}: Missing Permission (Manage Roles)`))
                            return;
                        };
                        if(guildFetch.members.cache.get(client.user.id).permissions.has(Discord.PermissionFlagsBits.ManageChannels) == false) {
                            const embed = new Discord.EmbedBuilder()
                             .setTitle(`**Error:** Tempjail`)
                             .setDescription('❌ Sorry, I Don\'t have Permission! `Manage Channels`')
                             .setColor(0xFF0000)
                             .setFooter({text:`execute unjail command for more details.`})
                            sendnofiMessage({embeds: [embed]});
                            jailuserlist.updateOne(allexpireprisoner, {
                                $unset: {jailTime: allexpireprisoner.jailTime}
                            }).then(console.log(`[timeJail $unset] removed jailTime of ${allexpireprisoner.UserID} in ${specguild}: Missing Permission (Manage Roles)`))
                            return;
                       };
                        // ============================================================================================================= //
                        // LASTPOLICEROLESLIST
                        function fngetPoliceRolesID() {
                            return new Promise(resolve => {
                                serverSettingslist.findOne({guildID: guildFetch.id}).then(async getServerSettings => {
                                    let svpoliceroleslist = []; let dbpoliceroleslist = [];
                                    if(guildFetch.roles.cache.find(r => r.name.toLowerCase().includes('police'))) {
                                        guildFetch.roles.cache.filter(r => r.name.toLowerCase().includes('police')).forEach(rolesdocs => {
                                            svpoliceroleslist.push(`${rolesdocs.id}`)
                                        });
                                    } else {
                                        svpoliceroleslist = undefined;
                                    };
                                    if(getServerSettings && getServerSettings.policeRolesID && getServerSettings.policeRolesID.length > 0) {
                                        getServerSettings.policeRolesID.forEach(rolesdocs => {
                                            if(!guildFetch.roles.cache.get(`${rolesdocs}`)) {
                                                serverSettingslist.updateOne({guildID: guildFetch.id}, {$pull : { policeRolesID : rolesdocs } }).then(console.log(`[=[/]=] Update DB policeRolesID Remove roles ID: ${rolesdocs} due can't find this role in server ${guildFetch.name}(${guildFetch.id})`));
                                            } else {
                                                if(guildFetch.roles.cache.get(`${rolesdocs}`).permissions.has(Discord.PermissionFlagsBits.Administrator)) {
                                                    serverSettingslist.updateOne({guildID: guildFetch.id}, {$pull : { policeRolesID : rolesdocs } }).then(console.log(`[=[/]=] Update DB policeRolesID Remove roles ID: ${rolesdocs} due have ADMINISTRATOR PERMISSION ${guildFetch.name}(${guildFetch.id})`)); 
                                                } else {
                                                    dbpoliceroleslist.push(`${rolesdocs}`);
                                                };
                                            };
                                        });
                                    } else {
                                        dbpoliceroleslist = undefined;
                                    };
                                    if(typeof svpoliceroleslist == "object" && svpoliceroleslist.length < 1) svpoliceroleslist = undefined;
                                    if(typeof dbpoliceroleslist == "object" && dbpoliceroleslist.length < 1) dbpoliceroleslist = undefined;
                                    if(svpoliceroleslist == undefined && dbpoliceroleslist == undefined) {
                                        guildFetch.roles.create({
                                            name: '👮 POLICE 👮',
                                        }).then(async roles => resolve([roles.id])).catch(err => console.log(handler.user.tag + 'Can\'t create roles ' + err));
                                    } else {
                                        if(svpoliceroleslist == undefined) resolve((typeof dbpoliceroleslist == "object") ? dbpoliceroleslist : dbpoliceroleslist);
                                        if(dbpoliceroleslist == undefined) resolve((typeof svpoliceroleslist == "object") ? svpoliceroleslist : svpoliceroleslist);
                                        if(svpoliceroleslist != undefined && dbpoliceroleslist != undefined) resolve(svpoliceroleslist.concat(dbpoliceroleslist)) ; 
                                    };
                                });
                            }, 1000);
                        };
                        // ============================================================================================================= //
                        // getCategoryID
                        function fngetCategoryID() {
                            return new Promise(resolve => {
                                serverSettingslist.findOne({guildID: guildFetch.id}).then(async getServerSettings => {
                                    if(!getServerSettings || getServerSettings && !getServerSettings.prisonCategoryID) {
                                        if(guildFetch.channels.cache.find(ch => ch.name.toLowerCase().includes('prison') && ch.type === Discord.ChannelType.GuildCategory)) {
                                            if(guildFetch.channels.cache.find(ch => ch.name.toLowerCase().includes('prison') && ch.type === Discord.ChannelType.GuildCategory).permissionsFor(guildFetch.members.me.user.id).has(Discord.PermissionFlagsBits.ManageChannels && Discord.PermissionFlagsBits.ViewChannel)) {
                                                resolve(guildFetch.channels.cache.find(ch => ch.name.toLowerCase().includes('prison') && ch.type === Discord.ChannelType.GuildCategory).id);
                                            } else {
                                                if(getServerSettings && getServerSettings.prisonCategoryID) serverSettingslist.updateOne({guildID: guildFetch.id}, { $unset: {prisonCategoryID : getServerSettings.prisonCategoryID } }).then(console.log(`[serverSettings] $unset prisonCategoryID -> ${guildFetch.name}(${guildFetch.id}) due can't access prison category channel in server.`));
                                                sendnofiMessage(`❌ I can't access **#${guildFetch.channels.cache.find(ch => ch.name.toLowerCase().includes('prison') && ch.type === Discord.ChannelType.GuildCategory).name}**: don't have permission to view channel & manage channels`);
                                                resolve(false);
                                                
                                            }
                                        } else {
                                            resolve(false);
                                        };
                                    };
                                    if(getServerSettings && getServerSettings.prisonCategoryID) {
                                        if(guildFetch.channels.cache.find(ch => ch.id == getServerSettings.prisonCategoryID && ch.type === Discord.ChannelType.GuildCategory)) {
                                            if(guildFetch.channels.cache.find(ch => ch.id == getServerSettings.prisonCategoryID && ch.type === Discord.ChannelType.GuildCategory).permissionsFor(guildFetch.members.me.user.id).has(Discord.PermissionFlagsBits.ManageChannels && Discord.PermissionFlagsBits.ViewChannel)) {
                                                resolve(getServerSettings.prisonCategoryID);
                                            } else {
                                                if(getServerSettings && getServerSettings.prisonCategoryID) serverSettingslist.updateOne({guildID: guildFetch.id}, { $unset: {prisonCategoryID : getServerSettings.prisonCategoryID } }).then(console.log(`[serverSettings] $unset prisonCategoryID -> ${guildFetch.name}(${guildFetch.id}) due can't access prison category channel in server.`));
                                                sendnofiMessage(`❌ I can't access **#${guildFetch.channels.cache.find(ch => ch.id == getServerSettings.prisonCategoryID && ch.type === Discord.ChannelType.GuildCategory).name}**: don't have permission to view channel & manage channels`);
                                                resolve(false);
                                                
                                            }
                                        } else {
                                            if(getServerSettings && getServerSettings.prisonCategoryID) serverSettingslist.updateOne({guildID: guildFetch.id}, { $unset: {prisonCategoryID : getServerSettings.prisonCategoryID } }).then(console.log(`[serverSettings] $unset prisonCategoryID -> ${guildFetch.name}(${guildFetch.id}) due can't get channel id in server.`));
                                            resolve(false);
                                        }
                                    }
                                });
                            }, 1000);
                        };
                        // ============================================================================================================= //
                        Promise.all([fngetCategoryID(), fngetPoliceRolesID()]).then(async promiseResult => {
                            let getCategoryID = promiseResult[0];
                            let getPoliceRolesID = promiseResult[1];
                            if(getPoliceRolesID == undefined) {
                                guildFetch.roles.create({data: {
                                    name: '👮 POLICE 👮',
                                }}).catch(err => console.log(guildFetch.name + 'Can\'t create roles ' + err));
                            };
                            if(getCategoryID == false) {
                                guildFetch.channels.create({name: '۩ PRISON ۩', type: Discord.ChannelType.GuildCategory}).then(async channel => {
                                    await channel.permissionOverwrites.edit(guildFetch.members.me.user.id, {ViewChannel: true, ManageChannels: true, SendMessages: true});
                                    await channel.permissionOverwrites.edit(guildFetch.roles.everyone, {ViewChannel: false});
                                    if(getPoliceRolesID == undefined) {
                                        getPoliceRolesID = (interaction.guild.roles.cache.find(r => r.name.toLowerCase().includes('police'))) ? [interaction.guild.roles.cache.find(r => r.name.toLowerCase().includes('police'))] : [];
                                    };
                                    getPoliceRolesID.forEach(async (role) => {
                                        await channel.permissionOverwrites.edit(role, {ViewChannel: true});
                                    });
                                    return getCategoryID = channel.id;
                                });
                            };
                            if(!guildFetch.channels.cache.find(ch => ch.name.toLowerCase().includes('logs') && ch.parent && ch.parent.id=== getCategoryID)) {
                                guildFetch.channels.create({name: 'logs', type: Discord.ChannelType.GuildText}).then(async channel => {
                                    await channel.permissionOverwrites.edit(guildFetch.members.me.user.id, {ViewChannel: true, SendMessages: true})
                                    await channel.setParent(guildFetch.channels.cache.find(ch => ch.id=== getCategoryID && ch.type === Discord.ChannelType.GuildCategory) ? guildFetch.channels.cache.find(ch => ch.id=== getCategoryID && ch.type === Discord.ChannelType.GuildCategory) : guildFetch.channels.cache.find(ch => ch.name.toLowerCase().includes('prison') && ch.type === Discord.ChannelType.GuildCategory));
                                    await channel.permissionOverwrites.edit(guildFetch.roles.everyone, {ViewChannel: false});
                                    if(getPoliceRolesID == undefined) {
                                        getPoliceRolesID = (guildFetch.roles.cache.find(r => r.name.toLowerCase().includes('police'))) ? [guildFetch.roles.cache.find(r => r.name.toLowerCase().includes('police'))] : [];
                                    };
                                    getPoliceRolesID.forEach(async (role) => {
                                        await channel.permissionOverwrites.edit(role, {ViewChannel: true});
                                    });
                                });
                            };
                    
                            jailAdmin.findOne({GuildID: guildFetch.id}).then(async jailAdminFunction => { // Check JailAdmin Function
                                if(jailAdminFunction && guildFetch.members.me.roles.cache.find(r => r.guild.roles.client).position != guildFetch.roles.highest.position) {
                                    const embed = new Discord.EmbedBuilder()
                                    .setTitle(`**Error:** Tempjail`)
                                    .setDescription(`⚠️ Please execute \`settings\` command and enable jailAdmin Function again!: ${guildFetch.members.me.roles.cache.find(r => r.guild.roles.client).toString()} wasn't the hightest role in this server.`)
                                    .setFooter({text: `Disabled jailAdmin Function`})
                                    .setColor(0xFFCC00)
                                    await jailAdmin.deleteOne(jailAdminFunction).then(() => {sendnofiMessage({embeds: [embed]})});
                                    return;
                                };
                            });
                            let target = userFetch;
                            try {
                                const promiseunjailA = [];
                                for(const channel of guildFetch.channels.cache.values()) {
                                    if(channel.permissionsFor(target.id).has(Discord.PermissionFlagsBits.ViewChannel && Discord.PermissionFlagsBits.SendMessages) == false && channel.permissionOverwrites) {
                                        promiseunjailA.push(channel.permissionOverwrites.delete(target.id));
                                    };
                                };
                                Promise.all(promiseunjailA).catch(err => console.log(guildFetch.name + 'PromiseunjailA Failed!' + err))
                                console.log('{JAIL+} Unjailed ' + userFetch.user.tag + ' at ' + guildFetch.name + `(${guildFetch.id})`);
                            } catch(err) {
                                console.error(`Error untempjail: ${err}`);
                            };  
                            if(!allexpireprisoner) return;
                            if(allexpireprisoner.UserRoles) {
                                allexpireprisoner.UserRoles.forEach(role => {
                                    if(!role) return;
                                    if(guildFetch.roles.cache.get(role) == guildFetch.roles.everyone.id) return;
                                    if(!guildFetch.roles.cache.get(role)) return;
                                    if(guildFetch.roles.cache.get(role).position < guildFetch.members.me.roles.cache.find(r => r.guild.roles.client)) return;
                                    userFetch.roles.add(role).then(console.log(`Add roles for ${userFetch.user.tag} due JailAdmin Function!`)).catch(err => console.log(`Found error while adding role in unjailtemp ${err}`));
                                });
                            };
                            jailuserlist.deleteOne(allexpireprisoner).then(() => {console.log(`{tempJail+} REMOVED ${userFetch.user.tag}(${userFetch.user.id}) out of database`)});
                            let reason = (allexpireprisoner.reason != 'none') ? `\nReason: ${allexpireprisoner.reason}` : ``;
                            const untempjailembed = new Discord.EmbedBuilder()
                                .setTitle('🔓 '+ ' Court')
                                .setDescription('💬 ' + userFetch.user.toString() + ' was Unjailed!' + `${reason}`)
                                .setThumbnail(userFetch.user.avatarURL({size: 1024}))
                                .setFooter({text: 'Unjail by ' + client.user.tag, iconURL: client.user.avatarURL({size: 1024})})
                                .setColor(0x00FFFF)
                                .setTimestamp()    
                            try {                
                                guildFetch.channels.cache.forEach(channel => {
                                    if(channel.parent && channel.parent.id === getCategoryID && channel.name.toLowerCase().includes('logs') && channel.type === Discord.ChannelType.GuildText) {
                                        if(channel.permissionsFor(guildFetch.members.me.user.id).has(Discord.PermissionFlagsBits.SendMessages && Discord.PermissionFlagsBits.ViewChannel)) {
                                            setTimeout(() => channel.send({embeds: [untempjailembed]}), 3000);
                                        };
                                    };
                                });                
                            } catch(err) {                  
                                console.log(`untempjail logs error ${err}`);      
                            };
                            const unjailmessage =  new Discord.EmbedBuilder()
                            .setAuthor({name: 'Server: ' + guildFetch.name, iconURL: guildFetch.iconURL({size: 2048})})
                            .setDescription('💬 You are released from prison!')
                            .setColor(0x00FFFF)
                            .setFooter({text: 'Unjail by ' + client.user.tag, iconURL: client.user.avatarURL({size: 1024})})
                            .setTimestamp()
                            try { 
                                if(userFetch) userFetch.send({embeds: [unjailmessage]}).catch(err => {console.log(`Error while sending unjailtempmessage to user ->  ${err}`)}) 
                            } catch(err) {
                                console.log(`untempjail send messages error -> ${err}`);
                            };
                        });           
                    } catch(err) {
                        console.log(`unjailTemp failed: ${err}`)
                    };
                };
                client.shard.broadcastEval(unjailEval, {context: {prisonerdb: allexpireprisoner}});
            });
        });
    });
    }, 10000);
    setInterval(() => { /* ทำการเช็ค premiumTime */
        premiumlist.find({Expire : { $lt: Date.now() }}).then(async allexpirepremiumserver => {
            allexpirepremiumserver.forEach((expirepremiumserver) => {
                Promise.all([jailwhenjoinlist.findOne({guildID: `${expirepremiumserver.GuildID}`}), serverSettingslist.findOne({guildID: `${expirepremiumserver.GuildID}`}), antispamlist.findOne({GuildID : `${expirepremiumserver.GuildID}`}), jailrolesfunctionlist.findOne({GuildID : `${expirepremiumserver.GuildID}`})]).then(async promiseResult => {
                    let isJailWhenJoin = promiseResult[0];
                    let getServerSettings = promiseResult[1];
                    let isAntiSpam = promiseResult[2];
                    let isJailRoles = promiseResult[3];
                    client.shard.broadcastEval(async (client, {guildId}) => {
                        let guildFetch = client.guilds.cache.get(guildId);
                        return guildFetch ? true : false;
                    }, {context: {guildId: expirepremiumserver.GuildID}}).then(async resultArray => {
                        let guildAvailable = (resultArray.includes(true)) ? true : false;
                        if(!resultArray.includes(true)) {
                            console.log(`Premium Server logsData can't cache server ${expirepremiumserver.GuildID}`);
                        };
                        let guildFetch = client.guilds.cache.get(expirepremiumserver.GuildID);
                        // ============================================================================================================= //
                        // getCategoryID
                        function fngetCategoryID() {
                            return new Promise(resolve => {
                                if(!guildFetch) return resolve(false);
                                serverSettingslist.findOne({guildID: guildFetch.id}).then(async getServerSettings => {
                                    if(!getServerSettings || getServerSettings && !getServerSettings.prisonCategoryID) {
                                        if(guildFetch.channels.cache.find(ch => ch.name.toLowerCase().includes('prison') && ch.type === Discord.ChannelType.GuildCategory)) {
                                            if(guildFetch.channels.cache.find(ch => ch.name.toLowerCase().includes('prison') && ch.type === Discord.ChannelType.GuildCategory).permissionsFor(guildFetch.members.me.user.id).has(Discord.PermissionFlagsBits.ManageChannels && Discord.PermissionFlagsBits.ViewChannel)) {
                                                resolve(guildFetch.channels.cache.find(ch => ch.name.toLowerCase().includes('prison') && ch.type === Discord.ChannelType.GuildCategory).id);
                                            } else {
                                                if(getServerSettings && getServerSettings.prisonCategoryID) serverSettingslist.updateOne({guildID: guildFetch.id}, { $unset: {prisonCategoryID : getServerSettings.prisonCategoryID } }).then(console.log(`[serverSettings] $unset prisonCategoryID -> ${guildFetch.name}(${guildFetch.id}) due can't access prison category channel in server.`));
                                                resolve(false);
                                                
                                            }
                                        } else {
                                            resolve(false);
                                        };
                                    };
                                    if(getServerSettings && getServerSettings.prisonCategoryID) {
                                        if(guildFetch.channels.cache.find(ch => ch.id == getServerSettings.prisonCategoryID && ch.type === Discord.ChannelType.GuildCategory)) {
                                            if(guildFetch.channels.cache.find(ch => ch.id == getServerSettings.prisonCategoryID && ch.type === Discord.ChannelType.GuildCategory).permissionsFor(guildFetch.members.me.user.id).has(Discord.PermissionFlagsBits.ManageChannels && Discord.PermissionFlagsBits.ViewChannel)) {
                                                resolve(getServerSettings.prisonCategoryID);
                                            } else {
                                                if(getServerSettings && getServerSettings.prisonCategoryID) serverSettingslist.updateOne({guildID: guildFetch.id}, { $unset: {prisonCategoryID : getServerSettings.prisonCategoryID } }).then(console.log(`[serverSettings] $unset prisonCategoryID -> ${guildFetch.name}(${guildFetch.id}) due can't access prison category channel in server.`));
                                                resolve(false);
                                                
                                            }
                                        } else {
                                            if(getServerSettings && getServerSettings.prisonCategoryID) serverSettingslist.updateOne({guildID: guildFetch.id}, { $unset: {prisonCategoryID : getServerSettings.prisonCategoryID } }).then(console.log(`[serverSettings] $unset prisonCategoryID -> ${guildFetch.name}(${guildFetch.id}) due can't get channel id in server.`));
                                            resolve(false);
                                        }
                                    }
                                });
                            }, 1000);
                        };
                        // ============================================================================================================= //
                        fngetCategoryID().then(async getCategoryID => {
                            function logsData(msg) {
                                if (getCategoryID == false ) return;
                                try { 
                                    if(!guildFetch) return;
                                    if(getCategoryID == false) return;
                                    guildFetch.channels.cache.forEach(channel => {
                                        if(channel.parent && channel.parent.id === getCategoryID && channel.name.toLowerCase().includes('logs')) {
                                            if(channel.permissionsFor(client.user.id).has(Discord.PermissionFlagsBits.SendMessages && Discord.PermissionFlagsBits.ViewChannel)) {
                                            setTimeout(() => { channel.send(msg) }, 3000)
                                            };
                                        };
                                    });       
                            
                                } catch(err) {
                            
                                console.log(`Error while trying to log premium expire:  ${err}`);
                            
                                };
                            };
                            if(expirepremiumserver) {
                                premiumlist.deleteOne(expirepremiumserver).then(() => { 
                                    console.log(`{PREMIA} removed ${expirepremiumserver.GuildID}: timed out`);
                                    if(guildAvailable == true) {
                                        const embed = new Discord.EmbedBuilder()
                                        .setAuthor({name: `❌ Function Disabled`, iconURL: client.guilds.cache.get(`${expirepremiumserver.GuildID}`).iconURL({size: 1024})})
                                        .setDescription(`Turn off : \`🎫 Premium Server\``)
                                        .setFooter({text: `Timeout!`})
                                        .setColor(0xFF0000)
                                        .setTimestamp()
                                        logsData({embeds: [embed]}); 
                                    };
                                });
                            };
                            if(isAntiSpam) {
                                antispamlist.deleteOne(isAntiSpam).then(() => {
                                    console.log(`{ANTISPAM} removed ${expirepremiumserver.GuildID}: timed out`)
                                    if(guildAvailable == true) {
                                        const embed = new Discord.EmbedBuilder()
                                        .setAuthor({name: `❌ Function Disabled`, iconURL: client.guilds.cache.get(`${expirepremiumserver.GuildID}`).iconURL({size: 1024})})
                                        .setDescription(`Turn off : \`1️⃣ AntiSpam (with Jail System)\``)
                                        .setFooter({text: `Timeout!`})
                                        .setColor(0xFF0000)
                                        .setTimestamp()
                                        logsData({embeds: [embed]});
                                    };
                                });
                            };
                            if(isJailRoles) {
                                jailrolesfunctionlist.deleteOne(isJailRoles).then(() => {
                                    console.log(`{jailRoles} removed ${expirepremiumserver.GuildID}: timed out`)
                                    if(guildAvailable == true) {
                                        const embed = new Discord.EmbedBuilder()
                                        .setAuthor({name: `❌ Function Disabled`, iconURL: client.guilds.cache.get(`${expirepremiumserver.GuildID}`).iconURL({size: 1024})})
                                        .setDescription(`Turn off : \`2️⃣ Command: jail-roles\``)
                                        .setFooter({text: `Timeout!`})
                                        .setColor(0xFF0000)
                                        .setTimestamp()
                                        logsData({embeds: [embed]});
                                    };
                                });
                            };
                            if(isJailWhenJoin) {
                                jailwhenjoinlist.deleteOne(isJailWhenJoin).then(() => {
                                    console.log(`{jailwhenjoin} removed ${expirepremiumserver.GuildID}: timed out`)
                                    if(guildAvailable == true) {
                                        const embed = new Discord.EmbedBuilder()
                                        .setAuthor({name: `❌ Function Disabled`, iconURL: client.guilds.cache.get(`${expirepremiumserver.GuildID}`).iconURL({size: 1024})})
                                        .setDescription(`Turn off : \`3️⃣ JailWhenJoin\``)
                                        .setFooter({text: `Timeout!`})
                                        .setColor(0xFF0000)
                                        .setTimestamp()
                                        logsData({embeds: [embed]});
                                    };
                                });
                            };
                            if(getServerSettings) {
                                serverSettingslist.deleteOne(getServerSettings).then(() => {
                                    console.log(`{server-settings} removed ${expirepremiumserver.GuildID}: timed out`)
                                    if(guildAvailable == true) {
                                        let modules = [];
                                        if(getServerSettings.policeRolesID.length > 0) {
                                            modules.push(`\`👮 Custom Police Roles\``);
                                        }
                                        if(getServerSettings.prisonCategoryID) {
                                            modules.push(`\`👪 Custom Category Channel\``);
                                        }
                                        const embed = new Discord.EmbedBuilder()
                                        .setAuthor({name: `❌ Function Disabled`, iconURL: client.guilds.cache.get(`${expirepremiumserver.GuildID}`).iconURL({size: 1024})})
                                        .setDescription(`Turn off : Some server settings. \`${modules.join(' , ')}\``)
                                        .setFooter({text: `Timeout!`})
                                        .setColor(0xFF0000)
                                        .setTimestamp()
                                        logsData({embeds: [embed]});
                                    };
                                });
                            };
                        });
                        
                    });
                });
            });
        });
    }, 60000)
    setInterval(() => { /* ทำการเช็ค muteTime */
        muteuserlist.find({ muteTime: { $lt: Date.now() } }).then(async expireMuted => {
             expireMuted.forEach(async (allexpiremuted) => {
                client.shard.broadcastEval(async (client, {guildId}) => {
                    let guildFetch = client.guilds.cache.get(guildId);
                    return guildFetch ? true : false;
                }, {context: {guildId: allexpiremuted.GuildID}}).then(async resultArray => {
                    if(!resultArray.includes(true)) {
                        muteuserlist.updateOne(allexpiremuted, {
                            $unset: {muteTime: allexpiremuted.muteTime}
                        }).then(() => console.log(`[tempMute $unset] removed muteTime of ${allexpiremuted.UserID}: Guild == null`))
                        return;
                    };
                    const unmuteEval = async(client, prisonerdb) => {
                        const Discord = require('discord.js');
                        const path = require('path');
                        const muteuserlist = require(path.join(process.cwd() + '/models/muteuserlist-profile-schema'));
                        const serverSettingslist = require(path.join(process.cwd() + '/models/settings-server-schema'));
                        let allexpiremuted = prisonerdb.prisonerdb
                        let specguild = allexpiremuted.GuildID;
                        let guildFetch = client.guilds.cache.get(specguild);
                        if(!guildFetch) return;
                        let userFetch = guildFetch.members.cache.get(allexpiremuted.UserID);
                        if(!userFetch) {
                            muteuserlist.updateOne(allexpiremuted, {
                                $unset: {muteTime: allexpiremuted.muteTime}
                            }).then(console.log(`[timeMute $unset] removed muteTime of ${allexpiremuted.UserID}: User in guild == null`))
                            return;
                        };
                        function sendnofiMessage(msg) {
                            let sendChannel = '';
                            guildFetch.channels.cache.forEach((channel) => {
                                if(channel.permissionsFor(client.user.id).has(Discord.PermissionFlagsBits.SendMessages && Discord.PermissionFlagsBits.ViewChannel && Discord.PermissionFlagsBits.EmbedLinks) && sendChannel == '' && channel.type == Discord.ChannelType.GuildText) {
                                    if(sendChannel == '') sendChannel = channel.id;
                                };
                            });
                                try {
                                    guildFetch.channels.cache.get(sendChannel).send(msg)
                                } catch(err) {
                                    console.log(`Failed sendnofiMessage() due ${err}`)
                                };
                        };
                        try {
                            if(guildFetch.members.cache.get(client.user.id).permissions.has(Discord.PermissionFlagsBits.ManageRoles) == false) {
                                const embed = new Discord.EmbedBuilder()
                                 .setTitle(`**Error:** Tempmute`)
                                 .setDescription('❌ Sorry, I Don\'t have Permission! `Manage Roles`')
                                 .setColor(0xFF0000)
                                 .setFooter({text: `execute unmute command for more details.`})
                                sendnofiMessage({embeds: [embed]});
                                muteuserlist.updateOne(allexpiremuted, {
                                    $unset: {muteTime: allexpiremuted.muteTime}
                                }).then(() => console.log(`[timeMute $unset] removed muteTime of ${allexpiremuted.UserID}: Missing Permission (Manage Roles)`));
                                return;
                            };
                            if(guildFetch.members.cache.get(client.user.id).permissions.has(Discord.PermissionFlagsBits.ManageChannels) == false) {
                                const embed = new Discord.EmbedBuilder()
                                 .setTitle(`**Error:** Tempmute`)
                                 .setDescription('❌ Sorry, I Don\'t have Permission! `Manage Channels`')
                                 .setColor(0xFF0000)
                                 .setFooter({text: `execute unmute command for more details.`})
                                sendnofiMessage({embeds: [embed]});
                                muteuserlist.updateOne(allexpiremuted, {
                                    $unset: {muteTime: allexpiremuted.muteTime}
                                }).then(console.log(() => `[timeMute $unset] removed muteTime of ${allexpiremuted.UserID}: Missing Permission (Manage Roles)`));
                                return;
                            };
                            // ============================================================================================================= //
                            // LASTPOLICEROLESLIST
                            function fngetPoliceRolesID() {
                                return new Promise(resolve => {
                                    serverSettingslist.findOne({guildID: guildFetch.id}).then(async getServerSettings => {
                                        let svpoliceroleslist = []; let dbpoliceroleslist = [];
                                        if(guildFetch.roles.cache.find(r => r.name.toLowerCase().includes('police'))) {
                                            guildFetch.roles.cache.filter(r => r.name.toLowerCase().includes('police')).forEach(rolesdocs => {
                                                svpoliceroleslist.push(`${rolesdocs.id}`)
                                            });
                                        } else {
                                            svpoliceroleslist = undefined;
                                        };
                                        if(getServerSettings && getServerSettings.policeRolesID && getServerSettings.policeRolesID.length > 0) {
                                            getServerSettings.policeRolesID.forEach(rolesdocs => {
                                                if(!guildFetch.roles.cache.get(`${rolesdocs}`)) {
                                                    serverSettingslist.updateOne({guildID: guildFetch.id}, {$pull : { policeRolesID : rolesdocs } }).then(console.log(`[=[/]=] Update DB policeRolesID Remove roles ID: ${rolesdocs} due can't find this role in server ${guildFetch.name}(${guildFetch.id})`));
                                                } else {
                                                    if(guildFetch.roles.cache.get(`${rolesdocs}`).permissions.has(Discord.PermissionFlagsBits.Administrator)) {
                                                        serverSettingslist.updateOne({guildID: guildFetch.id}, {$pull : { policeRolesID : rolesdocs } }).then(console.log(`[=[/]=] Update DB policeRolesID Remove roles ID: ${rolesdocs} due have ADMINISTRATOR PERMISSION ${guildFetch.name}(${guildFetch.id})`)); 
                                                    } else {
                                                        dbpoliceroleslist.push(`${rolesdocs}`);
                                                    };
                                                };
                                            });
                                        } else {
                                            dbpoliceroleslist = undefined;
                                        };
                                        if(typeof svpoliceroleslist == "object" && svpoliceroleslist.length < 1) svpoliceroleslist = undefined;
                                        if(typeof dbpoliceroleslist == "object" && dbpoliceroleslist.length < 1) dbpoliceroleslist = undefined;
                                        if(svpoliceroleslist == undefined && dbpoliceroleslist == undefined) {
                                            guildFetch.roles.create({
                                                name: '👮 POLICE 👮',
                                            }).then(async roles => resolve([roles.id])).catch(err => console.log(handler.user.tag + 'Can\'t create roles ' + err));
                                        } else {
                                            if(svpoliceroleslist == undefined) resolve((typeof dbpoliceroleslist == "object") ? dbpoliceroleslist : dbpoliceroleslist);
                                            if(dbpoliceroleslist == undefined) resolve((typeof svpoliceroleslist == "object") ? svpoliceroleslist : svpoliceroleslist);
                                            if(svpoliceroleslist != undefined && dbpoliceroleslist != undefined) resolve(svpoliceroleslist.concat(dbpoliceroleslist)) ; 
                                        };
                                    });
                                }, 1000);
                            };
                            // ============================================================================================================= //
                            // getCategoryID
                            function fngetCategoryID() {
                                return new Promise(resolve => {
                                    serverSettingslist.findOne({guildID: guildFetch.id}).then(async getServerSettings => {
                                        if(!getServerSettings || getServerSettings && !getServerSettings.prisonCategoryID) {
                                            if(guildFetch.channels.cache.find(ch => ch.name.toLowerCase().includes('prison') && ch.type === Discord.ChannelType.GuildCategory)) {
                                                if(guildFetch.channels.cache.find(ch => ch.name.toLowerCase().includes('prison') && ch.type === Discord.ChannelType.GuildCategory).permissionsFor(guildFetch.members.me.user.id).has(Discord.PermissionFlagsBits.ManageChannels && Discord.PermissionFlagsBits.ViewChannel)) {
                                                    resolve(guildFetch.channels.cache.find(ch => ch.name.toLowerCase().includes('prison') && ch.type === Discord.ChannelType.GuildCategory).id);
                                                } else {
                                                    if(getServerSettings && getServerSettings.prisonCategoryID) serverSettingslist.updateOne({guildID: guildFetch.id}, { $unset: {prisonCategoryID : getServerSettings.prisonCategoryID } }).then(console.log(`[serverSettings] $unset prisonCategoryID -> ${guildFetch.name}(${guildFetch.id}) due can't access prison category channel in server.`));
                                                    sendnofiMessage(`❌ I can't access **#${guildFetch.channels.cache.find(ch => ch.name.toLowerCase().includes('prison') && ch.type === Discord.ChannelType.GuildCategory).name}**: don't have permission to view channel & manage channels`);
                                                    resolve(false);
                                                    
                                                }
                                            } else {
                                                resolve(false);
                                            };
                                        };
                                        if(getServerSettings && getServerSettings.prisonCategoryID) {
                                            if(guildFetch.channels.cache.find(ch => ch.id == getServerSettings.prisonCategoryID && ch.type === Discord.ChannelType.GuildCategory)) {
                                                if(guildFetch.channels.cache.find(ch => ch.id == getServerSettings.prisonCategoryID && ch.type === Discord.ChannelType.GuildCategory).permissionsFor(guildFetch.members.me.user.id).has(Discord.PermissionFlagsBits.ManageChannels && Discord.PermissionFlagsBits.ViewChannel)) {
                                                    resolve(getServerSettings.prisonCategoryID);
                                                } else {
                                                    if(getServerSettings && getServerSettings.prisonCategoryID) serverSettingslist.updateOne({guildID: guildFetch.id}, { $unset: {prisonCategoryID : getServerSettings.prisonCategoryID } }).then(console.log(`[serverSettings] $unset prisonCategoryID -> ${guildFetch.name}(${guildFetch.id}) due can't access prison category channel in server.`));
                                                    sendnofiMessage(`❌ I can't access **#${guildFetch.channels.cache.find(ch => ch.id == getServerSettings.prisonCategoryID && ch.type === Discord.ChannelType.GuildCategory).name}**: don't have permission to view channel & manage channels`);
                                                    resolve(false);
                                                    
                                                }
                                            } else {
                                                if(getServerSettings && getServerSettings.prisonCategoryID) serverSettingslist.updateOne({guildID: guildFetch.id}, { $unset: {prisonCategoryID : getServerSettings.prisonCategoryID } }).then(console.log(`[serverSettings] $unset prisonCategoryID -> ${guildFetch.name}(${guildFetch.id}) due can't get channel id in server.`));
                                                resolve(false);
                                            }
                                        }
                                    });
                                }, 1000);
                            };
                            // ============================================================================================================= //
                            Promise.all([fngetCategoryID(), fngetPoliceRolesID()]).then(async promiseResult => {
                                let getCategoryID = promiseResult[0];
                                let getPoliceRolesID = promiseResult[1];
                                if(getCategoryID == false) {
                                    interaction.guild.channels.create({name: '۩ PRISON ۩', type: Discord.ChannelType.GuildCategory}).then(async channel => {
                                        await channel.permissionOverwrites.edit(interaction.guild.members.me.user.id, {ViewChannel: true, ManageChannels: true, SendMessages: true})
                                        await channel.permissionOverwrites.edit(interaction.guild.roles.everyone, {ViewChannel: false});
                                        if(getPoliceRolesID == undefined) {
                                            getPoliceRolesID = (interaction.guild.roles.cache.find(r => r.name.toLowerCase().includes('police'))) ? [interaction.guild.roles.cache.find(r => r.name.toLowerCase().includes('police'))] : [];
                                        };
                                        getPoliceRolesID.forEach(async (role) => {
                                            await channel.permissionOverwrites.edit(role, {ViewChannel: true});
                                        });
                                        return getCategoryID = channel.id;
                                    });
                                };
                                if(!guildFetch.channels.cache.find(ch => ch.name.toLowerCase().includes('logs') && ch.parent && ch.parent.id=== getCategoryID)) {
                                    guildFetch.channels.create({name: 'logs', type: Discord.ChannelType.GuildText}).then(async channel => {
                                        await channel.permissionOverwrites.edit(guildFetch.members.me.user.id, {ViewChannel: true, SendMessages: true})
                                        await channel.setParent(guildFetch.channels.cache.find(ch => ch.id=== getCategoryID && ch.type === Discord.ChannelType.GuildCategory) ? guildFetch.channels.cache.find(ch => ch.id=== getCategoryID && ch.type === Discord.ChannelType.GuildCategory) : guildFetch.channels.cache.find(ch => ch.name.toLowerCase().includes('prison') && ch.type === Discord.ChannelType.GuildCategory));
                                        await channel.permissionOverwrites.edit(guildFetch.roles.everyone, {ViewChannel: false});
                                        if(getPoliceRolesID == undefined) {
                                            getPoliceRolesID = (guildFetch.roles.cache.find(r => r.name.toLowerCase().includes('police'))) ? [guildFetch.roles.cache.find(r => r.name.toLowerCase().includes('police'))] : [];
                                        };
                                        getPoliceRolesID.forEach(async (role) => {
                                            await channel.permissionOverwrites.edit(role, {ViewChannel: true});
                                        });
                                    });
                                };
                                let target = userFetch;
                                try {
                                    const promiseunmuteA = [];
                                    for(const channel of guildFetch.channels.cache.values()) {
                                        if(channel.permissionsFor(target.id).has(Discord.PermissionFlagsBits.SendMessages && Discord.PermissionFlagsBits.Speak) == false) {
                                            promiseunmuteA.push(channel.permissionOverwrites.delete(target.id))
                                        };
                                    };
                                    Promise.all(promiseunmuteA).catch(err => console.log(guildFetch.name + 'PromiseunmuteA Failed!' + err))
                                } catch(err) {
                                    console.error(`unmutetemp error -> ${err}`);
                                };
                                const untempmutefinish = new Discord.EmbedBuilder()
                                .setTitle('🏥 ' + ' Hospital')
                                .setDescription('💬 ' + target.user.toString() + ' was unmuted!')
                                .setThumbnail(target.user.avatarURL({size: 1024}))
                                .setFooter({text: 'Unmuted by ' + client.user.tag, iconURL: client.user.avatarURL({size: 1024})})
                                .setColor(0x00FFFF)
                                .setTimestamp()
                               console.log('Unmuted ' + target.user.tag + `(${target.user.id})` + ' at ' + guildFetch.name + `(${specguild})`);
                               muteuserlist.deleteOne(allexpiremuted).then(() => console.log(`{tempMute+} REMOVED ${target.user.tag}(${target.user.id}) out of database!`))
                               try {                
                                guildFetch.channels.cache.forEach(channel => {
                                    if(channel.parent && channel.parent.id === getCategoryID && channel.name.toLowerCase().includes('logs')) {
                                        if(channel.permissionsFor(guildFetch.members.me).has(Discord.PermissionFlagsBits.SendMessages && Discord.PermissionFlagsBits.ViewChannel)) {
                                        setTimeout(() => channel.send({embeds: [untempmutefinish]}), 3000)
                                        };
                                    };
                                });
                        
                               } catch(err) {
                        
                                console.log(`untempmute error logs ${err}`);
                        
                               };
                            });
                        } catch(err) {
                            console.log(`unmuteTemp error: ${err}`)
                        }
                    };
                    client.shard.broadcastEval(unmuteEval, {context: {prisonerdb: allexpiremuted}});
                });
            });
        });
    }, 10000)
      console.log(`Starting Interval at ready event.`);
      client.user.setActivity({name: `Prisoner | /help`, type: Discord.ActivityType.Watching});
  }, 240000)
  Promise.all([antispamlist.find(), jailwhenjoinlist.find()]).then(async docs => {
    let antispamdocs = docs[0];
    let jailwhenjoindocs = docs[1];
    antispamdocs.forEach(async (data) => {
        jailWhenSpamGuildCheck.set(data.GuildID);
    });
    jailwhenjoindocs.forEach(async (data) => {
        jailWhenJoinGuildCheck.set(data.guildID);
    });
    console.log(`Starting Map set at ready event Interval.`);
  });
});
client.on(Discord.Events.InteractionCreate, async interaction => {
	if(!interaction.isChatInputCommand()) return;
    if(interaction.user.bot) return;
	const command = interaction.client.commands.get(interaction.commandName);
	if(!command) return;
    try {
        if(interaction.commandName === "settings" || interaction.commandName === "redeem") { 
            await interaction.deferReply({ephemeral: true});
        } else {
            await interaction.deferReply();
        };
    } catch(err) {
        console.error(`failed to defer -> ${err}`);
    };
    if(!interaction.guild) {
        const antidmembed = new Discord.EmbedBuilder()
        .setDescription('❌ Invite Me into Server to Type Command!')
        .setColor(0xFF0000)
        return console.log('Direct Message Warning >> ' + interaction.user.tag + ' | ' + interaction.commandName), interaction.editReply({embeds: [antidmembed]}).catch(err => {console.error(err)});
    };
    if(commandCooldownmap.has(interaction.user.id)) {
        const embed = new Discord.EmbedBuilder()
        .setDescription('💬 You need to wait 3 seconds before execute this command again!')
        .setColor(0x00FFFF)
       interaction.editReply({embeds: [embed], ephemeral: true}).catch(err => {console.error(err)});
       return;
    };
    commandCooldownmap.set(interaction.user.id);
    setTimeout(() => {commandCooldownmap.delete(interaction.user.id)}, 3000);
    try {
        blacklist.findOne({UserID: interaction.user.id}).then(async bluser => {
            if(bluser) {
                client.shard.broadcastEval(async (client, {executorId}) => {
                    let fetchUser = await client.users.fetch(`${executorId}`);
                    if(fetchUser) {
                        return [{"userTag": client.users.cache.get(`${executorId}`).tag, "userId": client.users.cache.get(`${executorId}`).id}]
                    } else {
                        return undefined;
                    };
                }, {context: {executorId: bluser.ExecuteID}}).then(async result => {
                    let executorInfo = {
                        userTag: undefined,
                        userId: undefined,
                    };
                    if(!result || result == undefined || result == null) {
                        executorInfo = {
                            userTag: undefined,
                            userId: undefined
                        };
                    } else {
                        result.forEach(async (docs) => {
                            if(!docs || docs == undefined || docs == null) return;
                            executorInfo = {
                                userId: docs[0].userId,
                                userTag: docs[0].userTag
                            };
                        });
                    };
                    interaction.editReply({content: `You have been blacklisted by **${executorInfo.userTag}**(${executorInfo.userId}) - Please contact **Jailme+ developer** or **Jailme+ moderator**`, ephemeral: true}).catch(err => {console.error(err)});
                });
            } else {
                await command.execute(interaction);
                console.log(`/${interaction.commandName} executed by ${interaction.user.tag}(${interaction.user.id}) at server ${interaction.guild.name}(${interaction.guild.id})`);
            };
        });
    } catch(err) {
        console.error(err);
        interaction.editReply({
            content: "An error occurred while executing the command, Please try again !",
            ephemeral: true,
        }).catch(err => {console.error(err)});
    };
});

dbl.on('posted', () => {
    console.log(`Posted guild count to Discord bot list (top.gg)`);
});

dbl.on('error', e => {
    console.log(`Error while posting guild count to Discord bot list! --> ${e}`);
});

client.on(Discord.Events.GuildCreate, guild => {
    if(!guild.available) return;
    console.log(`[+] Join ${guild.name}(${guild.id})`)
});

client.on(Discord.Events.GuildDelete, guild => {
    if(!guild.available) return;
    console.log(`[-] Leave ${guild.name}(${guild.id})`)
});

client.on(Discord.Events.MessageCreate , async message => { /* JailWhenSpam */
    if(message.author.bot) return;
    if(!message.guild) return;
    if(!message.member) return;
    if(!jailWhenSpamGuildCheck.has(message.guild.id)) return;
    if(message.member.permissions.has(Discord.PermissionFlagsBits.ManageGuild)) return;
    Promise.all([premiumlist.findOne({GuildID: message.guild.id}), jailuserlist.findOne({UserID: message.author.id, GuildID: message.guild.id}), antispamlist.findOne({GuildID: message.guild.id})]).then(async promiseResult => {
        let isPremium = promiseResult[0];
        let jaildb = promiseResult[1];
        let datadb = promiseResult[2];
        if(!isPremium && datadb) return antispamlist.deleteOne(datadb).then(() => console.log(`{ANTISPAM} Removed ${message.guild.name}: Non-Premium`));
        if(isPremium && isPremium.Expire < Date.now() && datadb) return antispamlist.deleteOne(datadb).then(() => console.log(`{ANTISPAM} Removed ${message.guild.name}: Timed out`))
        if(!isPremium) return;
        if(isPremium && isPremium.Expire < Date.now()) return;
        if(jaildb) return;
        if(spamUsersMap.has(`${message.author.id}.${message.guild.id}`)) {
            const spamusersData = spamUsersMap.get(`${message.author.id}.${message.guild.id}`);
            const { lastMessage, timer } = spamusersData;
            const difference = message.createdTimestamp - lastMessage.createdTimestamp;
            let msgCount = spamusersData.msgCount;
            if(difference > 7000) {
                clearTimeout(timer);
                spamusersData.msgCount = 1;
                spamusersData.lastMessage = message;
                spamusersData.timer = setTimeout(() => {
                    spamUsersMap.delete(`${message.author.id}.${message.guild.id}`)
                }, 3000)
                spamusersData.alreadyJail = false;
                spamUsersMap.set(`${message.author.id}.${message.guild.id}`, spamusersData)
            } else {
                ++msgCount;
                if(parseInt(msgCount) > 5 && spamusersData.warning < 4) {
                    let warnmessageoutput;
                    const warnmessagearray = [`Please **Slow down** you chat before you typing again!`, `Please wait a few seconds and chat again!`, `Don't Spam!`]
                    if(datadb && datadb.warnmessage) warnmessageoutput = datadb.warnmessage;
                    if(datadb && !datadb.warnmessage) warnmessageoutput = warnmessagearray[Math.floor(Math.random() * warnmessagearray.length)];
                    if(spamusersData.warning < 4) message.channel.send({content: `${message.author.toString()} ${warnmessageoutput} **(${spamusersData.warning} / 3)**`}).then(m => m.delete({timeout: 5000}))
                    spamusersData.warning = spamusersData.warning + 1;
                    message.delete()
                } else {
                    spamusersData.msgCount = msgCount;
                    spamUsersMap.set(`${message.author.id}.${message.guild.id}`, spamusersData)
                }
                if(spamusersData.warning > 3 && spamusersData.warning < 5) { //Jail SPam
                    if(spamusersData.warning != 4) return;
                    if(spamusersData.alreadyJail == true) return;
                    console.log(`[-*-] Antispam Detected --> ${message.member.user.username}(${message.member.user.id}) at ${message.guild.name}(${message.guild.id})`); 
                    spamusersData.alreadyJail = true;
                    await delay(1000);
                    try {
                        if(!message.guild.members.me.permissions.has(Discord.PermissionFlagsBits.EmbedLinks)) {
                            message.channel.send({content: '❌ AntiSpam Error: Sorry, I Don\'t have Permission! `Embed Links` --> Function Disabled!'})
                            await antispamlist.deleteOne(datadb).then(() => console.log(`{ANTISPAM} Removed ${message.guild.name}(${message.guild.id}): Missing Permission (Embed Links)`))
                            return;
                        };
                        if(!message.guild.members.me.permissions.has(Discord.PermissionFlagsBits.ManageRoles)) {
                            const embed = new Discord.EmbedBuilder()
                             .setDescription('❌ AntiSpam Error: Sorry, I Don\'t have Permission! `Manage Roles`')
                             .setFooter({text: 'Function Disabled!'})
                             .setColor(0xFF0000)
                            message.channel.send({embeds: [embed]})
                            await antispamlist.deleteOne(datadb).then(() => console.log(`{ANTISPAM} Removed ${message.guild.name}(${message.guild.id}): Missing Permission (Manage Roles)`))
                            return;
                        };
                        if(!message.guild.members.me.permissions.has(Discord.PermissionFlagsBits.ManageChannels)) {
                            const embed = new Discord.EmbedBuilder()
                             .setDescription('❌ AntiSpam Error: Sorry, I Don\'t have Permission! `Manage Channels`')
                             .setFooter({text: 'Function Desabled!'})
                             .setColor(0xFF0000)
                            message.channel.send({embeds: [embed]})
                            await antispamlist.deleteOne(datadb).then(() => console.log(`{ANTISPAM} Removed ${message.guild.name}(${message.guild.id}): Missing Permission (Manage Channels)`))
                            return;
                        };
                        Promise.all([phFunction.getCategoryID(message), phFunction.getPoliceRoles(message)]).then(async (promiseResult2) => {
                            let getCategoryID = promiseResult2[0];
                            let getPoliceRolesID = promiseResult2[1];
                            function logsData(logsMessage) { //logs function
                                try {                
                                    message.guild.channels.cache.forEach(channel => {
                                        if(channel.parent && channel.parent.id === getCategoryID && channel.name.toLowerCase().includes('logs') && channel.type === Discord.ChannelType.GuildText) {
                                            if(channel.permissionsFor(message.guild.members.me.user.id).has(Discord.PermissionFlagsBits.SendMessages && Discord.PermissionFlagsBits.ViewChannel)) {
                                                setTimeout(() => channel.send(logsMessage), 3000);
                                            };
                                        };
                                    });                
                                } catch(err) {                  
                                    console.log(`anti-spam jail logs error ${err}`);      
                                };
                            };
                            if(jaildb) return;
                            let timeremainingcheck;
                            if(datadb && datadb.jailTime) timeremainingcheck = `\nTime: \`${ms(parseInt(datadb.jailTime), {long: true})}\``;
                            if(datadb && !datadb.jailTime) timeremainingcheck = ``;
                            try {
                                const promiseitB = [];
                                for(const channel of message.guild.channels.cache.values()) {
                                    if(channel.permissionsFor(client.user.id).has(Discord.PermissionFlagsBits.ViewChannel)) {
                                        promiseitB.push(channel.permissionOverwrites.edit(message.author.id, {SendMessages: false, ViewChannel: false}))
                                    };
                                };
                                Promise.all(promiseitB).catch(err => console.log(message.author.tag + 'PromiseitB Failed!' + err))
                            } catch(err) {
                                console.error(`promiseitB error -> ${err}`);
                            };
                            message.guild.channels.create({name: `${message.author.tag}`, type: Discord.ChannelType.GuildText}).then(async channel => {
                                await channel.permissionOverwrites.edit(message.guild.members.me.user.id, {ViewChannel: true, SendMessages: true, ManageChannels: true});
                                await channel.setParent(message.guild.channels.cache.find(ch => ch.id === getCategoryID && ch.type === Discord.ChannelType.GuildCategory) ? message.guild.channels.cache.find(ch => ch.id === getCategoryID && ch.type === Discord.ChannelType.GuildCategory) : message.guild.channels.cache.find(ch => ch.name.toLowerCase().includes('prison') && ch.type === Discord.ChannelType.GuildCategory));
                                await channel.permissionOverwrites.edit(message.guild.roles.everyone, {ViewChannel: false});
                                await channel.permissionOverwrites.edit(message.author.id, {ViewChannel: true, SendMessages: true})
                                if(getPoliceRolesID == undefined) {
                                    getPoliceRolesID = (message.guild.roles.cache.find(r => r.name.toLowerCase().includes('police'))) ? [message.guild.roles.cache.find(r => r.name.toLowerCase().includes('police'))] : [];
                                };
                                getPoliceRolesID.forEach(async (role) => {
                                    await channel.permissionOverwrites.edit(role, {ViewChannel: true});
                                });
                                await channel.setTopic(message.author.id)
                                const antispamjailfinish = new Discord.EmbedBuilder()
                                .setAuthor({name: `AntiSpam` , iconURL: client.user.avatarURL({size: 1024})})
                                .setTitle('🔒 '+ ' Court')
                                .setDescription('💬 ' + message.author.toString() + ` was Jailed! ${timeremainingcheck}`)
                                .setFooter({text: 'Jailed by ' + client.user.tag, iconURL: client.user.avatarURL({size: 1024})})
                                .setColor(0x00FFFF)
                                .setTimestamp()
                                channel.send({embeds: [antispamjailfinish]})
                            });
                            const antispamjailfinish = new Discord.EmbedBuilder()
                            .setAuthor({name: `AntiSpam` , iconURL: client.user.avatarURL({size: 1024})})
                            .setTitle('🔒 '+ ' Court')
                            .setDescription('💬 ' + message.author.toString() + ` was Jailed! ${timeremainingcheck}`)
                            .setFooter({text: 'Jailed by ' + client.user.tag, iconURL: client.user.avatarURL({size: 1024})})
                            .setThumbnail(message.member.user.avatarURL({size: 1024}))
                            .setColor(0x00FFFF)
                            .setTimestamp()
                            message.channel.send({embeds: [antispamjailfinish]})
                            logsData({embeds: [antispamjailfinish]});      
                            const antispamjailmessage = new Discord.EmbedBuilder()
                            .setAuthor({name: 'Server: ' + message.guild.name, iconURL: message.guild.iconURL({size: 2048})})
                            .setDescription('💬 You are Prisoner now!')
                            .setColor(0x00FFFF)
                            .setFooter({text: 'Jailed by ' + client.user.tag, iconURL: client.user.avatarURL({size: 1024})})
                            .setTimestamp()
                            message.author.send({embeds: [antispamjailmessage]}).catch(err => {console.log(`Anti-spam author send error ${err}`)})
                            if(datadb && !datadb.jailTime) {
                                let newJailUserData = new jailuserlist({
                                    UserID: message.author.id,
                                    GuildID: message.guild.id,
                                    reason: 'spam',
                                });
                                newJailUserData.save().then(() => console.log(`{AntiSpamJail+} ADD ${message.member.user.tag}(${message.member.user.id}) into database!`))
                            };
                            if(datadb && datadb.jailTime) {
                                let newJailUserData = new jailuserlist({
                                    UserID: message.author.id,
                                    GuildID: message.guild.id,
                                    jailTime: Math.floor(Date.now() + datadb.jailTime),
                                    reason: 'spam',
                                });
                                newJailUserData.save().then(() => console.log(`{AntiSpamJail+} ADD ${message.member.user.tag}(${message.member.user.id}) into database!`))
                            };
                            console.log('[^] Fn: ANTI-SPAM Jail ' + message.member.user.tag + `(${message.member.user.id}) at ` + message.guild.name + `(${message.guild.id})`)
                        });
                    } catch(err) {
                        console.log(`ANTI-SPAM Failed --> ${err} at ${message.guild.name} (${message.guild.id})`)
                    };
                };
            };
        } else {
            let fn = setTimeout(() => {
                spamUsersMap.delete(`${message.author.id}.${message.guild.id}`)
            }, 15000);
            spamUsersMap.set(`${message.author.id}.${message.guild.id}`, {
                msgCount: 1,
                lastMessage: message,
                timer: fn,
                warning: 1
            });
        };
    });
});

client.on(Discord.Events.GuildMemberAdd, member => { //กันคนอยู่ในคุกออกแล้วเข้าเซิพมาใหม่ (ANTI-JAILBREAK)
    Promise.all([jailuserlist.findOne({UserID: member.user.id, GuildID: member.guild.id}), muteuserlist.findOne({UserID: member.user.id, GuildID: member.guild.id})]).then(async promiseResult => {
        let jaileduser = promiseResult[0];
        let muteduser = promiseResult[1];
        if(!muteduser && !jaileduser) return;
        Promise.all([phFunction.getCategoryID(member), phFunction.getPoliceRoles(member)]).then(async promiseResult2 => {
            let getCategoryID = promiseResult2[0];
            let getPoliceRolesID = promiseResult2[1];
            if(muteduser) {
                console.log(`[ANTIHOSPITAL] Detected ${member.guild.members.cache.get(muteduser.UserID).user.tag}(${muteduser.UserID}) at ${member.guild.name}(${member.guild.id})`);
                try {
                    const promiseotx = [];
                    for(const channel of member.guild.channels.cache.values()) {
                        if(channel.permissionsFor(client.user.id).has(Discord.PermissionFlagsBits.ViewChannel)) {
                            promiseotx.push(channel.permissionOverwrites.edit(member.guild.members.cache.get(muteduser.UserID), {SendMessages: false, Speak: false}));
                        };
                    };
                    Promise.all(promiseotx).catch(err => console.log(member.user.tag + 'Promiseotx Failed!' + err))
                } catch(err) {
                    console.error(`promiseotx err(anti-mutebreak) -> ${err}`);
                };
                const mutefinish = new Discord.EmbedBuilder()
                .setAuthor({name: `Anti-Jailbreak`, iconURL: client.user.avatarURL({size: 2048})})
                .setTitle('🏥 ' + ' Hospital')
                .setDescription('💬 ' + member.guild.members.cache.get(muteduser.UserID).user.tag + ' was muted!')
                .setThumbnail(member.guild.members.cache.get(muteduser.UserID).user.avatarURL({size: 1024}))
                .setFooter({text: `Muted by ${client.user.tag}`, iconURL: client.user.avatarURL({size: 2048})})
                .setColor(0x00FFFF)
                .setTimestamp()
                try {       
                    member.guild.channels.cache.forEach(channel => {
                        if(channel.parent && channel.parent.id=== getCategoryID && channel.name.toLowerCase().includes('logs')) {
                            if(channel.permissionsFor(client.user).has(Discord.PermissionFlagsBits.SendMessages && Discord.PermissionFlagsBits.ViewChannel)) {
                                setTimeout(() => channel.send({embeds: [mutefinish]}), 3000)
                            };
                        };
                    });
                } catch(err) {
                    console.log(`anti-jailbreak mutefinish error ${err}`);
                };
            };
            if(jaileduser) {
                console.log(`[ANTIJAILBREAK] Detected ${member.guild.members.cache.get(jaileduser.UserID).user.tag}(${jaileduser.UserID}) at ${member.guild.name}(${member.guild.id})`);
                try {
                    const promiseitx = [];
                    for(const channel of member.guild.channels.cache.values()) {
                        if(channel.permissionsFor(client.user.id).has(Discord.PermissionFlagsBits.ViewChannel)&&channel.permissionOverwrites) {
                            promiseitx.push(channel.permissionOverwrites.edit(member.guild.members.cache.get(jaileduser.UserID), {SendMessages: false, ViewChannel: false}));
                        };
                    };
                    Promise.all(promiseitx).catch(err => console.log(member.user.tag + 'Promiseitx Failed!' + err));
                } catch(err) {
                    console.error(`promiseitx(anti-jailbreak) err -> ${err}`);
                };
                try {
                    let target = jaileduser.UserID;
                    member.guild.channels.create({name: `${member.guild.members.cache.get(target).user.tag}`, type: Discord.ChannelType.GuildText}).then(async channel => {
                        await channel.permissionOverwrites.edit(member.guild.members.me.user.id, {ViewChannel: true, SendMessages: true, ManageChannels: true});
                        await channel.setParent(member.guild.channels.cache.find(ch => ch.id === getCategoryID && ch.type === Discord.ChannelType.GuildCategory) ? member.guild.channels.cache.find(ch => ch.id === getCategoryID && ch.type === Discord.ChannelType.GuildCategory) : member.guild.channels.cache.find(ch => ch.name.toLowerCase().includes('prison') && ch.type === Discord.ChannelType.GuildCategory));
                        await channel.permissionOverwrites.edit(member.guild.roles.everyone, {ViewChannel: false});
                        await channel.permissionOverwrites.edit(member.guild.members.cache.get(target).id, {ViewChannel: true, SendMessages: true})
                        await channel.permissionOverwrites.edit(member.user.id, {ViewChannel: true, SendMessages: true});
                        if(getPoliceRolesID == undefined) {
                            getPoliceRolesID = (member.guild.roles.cache.find(r => r.name.toLowerCase().includes('police'))) ? [member.guild.roles.cache.find(r => r.name.toLowerCase().includes('police'))] : [];
                        };
                        getPoliceRolesID.forEach(async (role) => {
                            await channel.permissionOverwrites.edit(role, {ViewChannel: true});
                        })
                        await channel.setTopic(member.guild.members.cache.get(target).user.id)
                        const jailfinish = new Discord.EmbedBuilder()
                        .setAuthor({name: `Anti-Jailbreak`, iconURL: client.user.avatarURL({size: 2048})})
                        .setTitle('🔒 '+ ' Court')
                        .setDescription('💬 ' + member.guild.members.cache.get(jaileduser.UserID).toString() + ' was Jailed!')
                        .setThumbnail(member.guild.members.cache.get(jaileduser.UserID).user.avatarURL({size: 1024}))
                        .setFooter({text: `Jailed by ${client.user.tag}`, iconURL: client.user.avatarURL({size: 2048})})
                        .setColor(0x00FFFF)
                        .setTimestamp()
                        channel.send({embeds: [jailfinish]});
                    });
                } catch {
                    console.error(err => console.log(`Anti-Jailbreak Can\'t Create Cell + ${err}`))
                };
                try {
                    const jailfinish = new Discord.EmbedBuilder()
                    .setAuthor({name: `Anti-Jailbreak`, iconURL: client.user.avatarURL({size: 2048})})
                    .setTitle('🔒 '+ ' Court')
                    .setDescription('💬 ' + member.guild.members.cache.get(jaileduser.UserID).toString() + ' was Jailed!')
                    .setThumbnail(member.guild.members.cache.get(jaileduser.UserID).user.avatarURL({size: 1024}))
                    .setFooter({text: `Jailed by ${client.user.tag}`, iconURL: client.user.avatarURL({size: 2048})})
                    .setColor(0x00FFFF)
                    .setTimestamp()        
                    member.guild.channels.cache.forEach(channel => {
                        if(channel.parent && channel.parent.id=== getCategoryID && channel.name.toLowerCase().includes('logs')) {
                            if(channel.permissionsFor(client.user).has(Discord.PermissionFlagsBits.SendMessages && Discord.PermissionFlagsBits.ViewChannel)) {
                                setTimeout(() => channel.send({embeds: [jailfinish]}), 3000)
                            };
                        };
                    });
                } catch(err) {
                    console.log(`anti-jailbreak jailfinish error ${err}`);    
                };
            };
        });
    });
});

client.on(Discord.Events.GuildMemberAdd, member => { /* JailWhenJoin */
    if(!jailWhenJoinGuildCheck.has(member.guild.id)) return;
    Promise.all([jailwhenjoinlist.findOne({guildID: member.guild.id}), premiumlist.findOne({GuildID: member.guild.id}), jailuserlist.findOne({UserID: member.user.id, GuildID: member.guild.id})]).then(async (promiseResult) => {
        let docs = promiseResult[0];
        let isPremium = promiseResult[1];
        let jaildb = promiseResult[2];
        if(!isPremium && docs) return jailwhenjoinlist.deleteOne(docs).then(() => console.log(`{JAILWHENJOIN} REMOVED ${member.guild.name}(${member.guild.id}): Non-Premium wtf`));
        if(isPremium && isPremium.Expire < Date.now() && docs) return jailwhenjoinlist.deleteOne(docs).then(() => console.log(`{JAILWHENJOIN} REMOVED ${member.guild.name}(${member.guild.id}): time out`));
        if(!isPremium) return;
        if(isPremium && isPremium.Expire < Date.now()) return;
        if(!docs) return;
        if(jaildb) return;
        console.log(`Jailwhenjoin activated ${member.guild.id} | ${member.user.id}`);
        Promise.all([phFunction.getCategoryID(member), phFunction.getPoliceRoles(member)]).then(async promiseResult2 => {
            let getCategoryID = promiseResult2[0];
            let getPoliceRolesID = promiseResult2[1];
            function logsData(logsMessage) { //logs function
                try {                
                    member.guild.channels.cache.forEach(channel => {
                        if(channel.parent && channel.parent.id === getCategoryID && channel.name.toLowerCase().includes('logs') && channel.type === Discord.ChannelType.GuildText) {
                            if(channel.permissionsFor(member.guild.members.me.user.id).has(Discord.PermissionFlagsBits.SendMessages && Discord.PermissionFlagsBits.ViewChannel)) {
                                setTimeout(() => channel.send(logsMessage), 3000);
                            };
                        };
                    });                
                } catch(err) {                  
                console.log(`jailwhenjoin logs error ${err}`);      
                };
            };
            if(member.guild.channels.cache.find(ch => ch.id === docs.prisonChannelID && ch.parent.id === getCategoryID)) {
                if(!member.guild.channels.cache.find(ch => ch.id === docs.prisonChannelID && ch.parent.id === getCategoryID).permissionsFor(client.user).has(Discord.PermissionFlagsBits.ViewChannel && Discord.PermissionFlagsBits.ManageChannels)) {
                    const embed = new Discord.EmbedBuilder()
                    .setAuthor({name: `❌ Function Disabled`, iconURL: member.guild.iconURL({size: 1024})})
                    .setDescription(`Turn off : \`3️⃣ JailWhenJoin\``)
                    .setColor(0xFF0000)
                    .setTimestamp()
                    .setFooter({text: `I don\'t have permissions to View & Manage ${member.guild.channels.cache.find(ch => ch.id === docs.prisonChannelID && ch.parent.id === getCategoryID).name} Channel!`, iconURL: client.user.avatarURL({size: 1024})})
                    jailwhenjoinlist.deleteOne(docs).then(() => {logsData({embeds: [embed]}), console.log(`{jailwhenjoin} Removed ${member.guild.name}(${member.guild.id}) out of database!: invalid perms View & Manage CHannel in that channel`)});
                    return;
                };
            } else {
                if(member.guild.channels.cache.find(ch => ch.id === docs.prisonChannelID && ch.parent.id !== getCategoryID)) {
                    const embed = new Discord.EmbedBuilder()
                    .setAuthor({name: `❌ Function Disabled`, iconURL: member.guild.iconURL({size: 1024})})
                    .setDescription(`Turn off : \`3️⃣ JailWhenJoin\``)
                    .setColor(0xFF0000)
                    .setTimestamp()
                    .setFooter({text: `${member.guild.channels.cache.find(ch => ch.id === docs.prisonChannelID && ch.parent.id !== getCategoryID).name} must be under prison category only!`, iconURL: client.user.avatarURL({size: 1024})})
                    jailwhenjoinlist.deleteOne(docs).then(() => { logsData({embeds: [embed]}), console.log(`{jailwhenjoin} Removed ${member.guild.name}(${member.guild.id}) out of database!: Channel is not under prison category`)});
                    return;
                };
                const embed = new Discord.EmbedBuilder()
                .setAuthor({name: `❌ Function Disabled`, iconURL: member.guild.iconURL({size: 1024})})
                .setDescription(`Turn off : \`3️⃣ JailWhenJoin\``)
                .setColor(0xFF0000)
                .setTimestamp()
                .setFooter({text: `Can\'t find that channels in this server.`, iconURL: client.user.avatarURL({size: 1024})})
                jailwhenjoinlist.deleteOne(docs).then(() => { logsData({embeds: [embed]}), console.log(`{jailwhenjoin} Removed ${member.guild.name}(${member.guild.id}) out of database!: invalid channel`)});
                return;
            };
            try {
                const promisedxd = [];
                for(const channel of member.guild.channels.cache.values()) {
                    if(channel.permissionsFor(client.user.id).has(Discord.PermissionFlagsBits.ViewChannel)) {
                        promisedxd.push(channel.permissionOverwrites.edit(member, {SendMessages: false, ViewChannel: false}))
                    };
                };
                Promise.all(promisedxd).catch(err => console.log(member.user.tag + 'promisedxd Failed!' + err));
            } catch(err) {
                console.error(`promisedxd(jailwhenjoin) err -> ${err}`);
            };
            try {
                let specifyChannel = member.guild.channels.cache.find(ch => ch.id === docs.prisonChannelID && ch.parent.id === getCategoryID);
                specifyChannel.permissionOverwrites.edit(member, {SendMessages: true, ViewChannel: true});
                const jailfinish = new Discord.EmbedBuilder()
                .setTitle('🔒 '+ ' Court')
                .setDescription('💬 ' + member.user.tag + ' was Jailed!')
                .setThumbnail(member.user.avatarURL({size: 1024}))
                .setFooter({text: `Jailed by ${client.user.tag}`, iconURL: client.user.avatarURL({size: 2048})})
                .setColor(0x00FFFF)
                .setTimestamp()
                logsData({embeds: [jailfinish]});
                if(docs.jailNotification == true) {
                    specifyChannel.send({embeds: [jailfinish]}).catch(err => {console.log(`Failed while sending jailwhenjoin_jailfinish at ${member.guild.name}(${member.guild.id}) due: ${err}`)});
                };
                const jailmessage = new Discord.EmbedBuilder()
                .setAuthor({name: 'Server: ' + member.guild.name, iconURL: member.guild.iconURL({size: 2048})})
                 .setDescription('💬 You are Prisoner now!')
                 .setColor(0x00FFFF)
                 .setFooter({text: 'Jailed by ' + client.user.tag, iconURL: client.user.avatarURL({size:1024})})
                 .setTimestamp()
                member.send({embeds: [jailmessage]}).catch(err => {console.log(`jailwhenjoin_jailfinish error:  ${err}`)})

                if(docs && docs.jailTime) {
                    let newJailUserData = new jailuserlist({
                        UserID: member.user.id,
                        GuildID: member.guild.id,
                        jailTime: Math.floor(Date.now() + docs.jailTime),
                        reason: "JailWhenJoin Function",
                    });
                    newJailUserData.save().then(() => console.log(`{Jail+} ADD ${member.user.tag}(${member.user.id}) into database! with function JailWhenJoin at ${member.guild.name}(${member.guild.id})`))
                };
                if(docs && !docs.jailTime) {
                    let newJailUserData = new jailuserlist({
                        UserID: member.user.id,
                        GuildID: member.guild.id,
                        reason: "JailWhenJoin Function",
                    });
                    newJailUserData.save().then(() => console.log(`{Jail+} ADD ${member.user.tag}(${member.user.id}) into database! with function JailWhenJoin at ${member.guild.name}(${member.guild.id})`))
                };
                if(docs && docs.jailNotification == false) {
                    jailuserlist.findOne({UserID: member.user.id, GuildID: member.guild.id}).then(async data => {
                        if(!data) return;
                        await delay(2000);
                        jailuserlist.updateOne({UserID: member.user.id, GuildID: member.guild.id}, { $set: {jailNoti: false} }).then(() => {console.log(`{JailWhenJoin} Turn off notification for user and updated {Jail+} jailNoti = false for ${member.user.tag}(${member.user.id}) at ${member.guild.name}(${member.guild.id})`)});
                    });
                };
            } catch {
                console.error(err => console.log(`JailWhenJoin Error + ${err}`))
            };
        });
    });
});

client.login();
