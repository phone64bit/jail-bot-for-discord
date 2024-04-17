const Discord = require('discord.js');
const phFunction = require('../function/main.js');
const jailuserlist = require('../models/jailuserlist-profile-schema');
const premiumlist = require('../models/premium-profile-schema');
const jailrolesfunctionlist = require('../models/settings-jailRoles-schema');
const jailAdmin = require('../models/settings-jailAdmin-schema');

module.exports = {
    data: new Discord.SlashCommandBuilder()
    .setName('jail-roles')
    .setDescription('Jail all users in specify role')
    .addRoleOption(o => o.setName('role').setDescription('mention role or specify role id').setRequired(true))
    .addChannelOption(o => o.setName('prison').setDescription('jail user(s) in specify channel').setRequired(true)),
    async execute(interaction) {
        if(!interaction.guild.members.me.permissions.has(Discord.PermissionFlagsBits.EmbedLinks)) {
            interaction.editReply({content: '❌ Sorry, I Don\'t have Permission! `Embed Links`', ephemeral: true}).catch(err => {console.error(err)})
            return;
        };
        if(!interaction.guild.members.me.permissions.has(Discord.PermissionFlagsBits.ManageRoles)) {
            const embed = new Discord.EmbedBuilder()
            .setDescription('❌ Sorry, I Don\'t have Permission! `Manage Roles`')
            .setColor(0xFF0000)
            interaction.editReply({embeds: [embed], ephemeral: true}).catch(err => {console.error(err)});
            return;
        };
        if(!interaction.guild.members.me.permissions.has(Discord.PermissionFlagsBits.ManageChannels)) {
            const embed = new Discord.EmbedBuilder()
            .setDescription('❌ Sorry, I Don\'t have Permission! `Manage Channels`')
            .setColor(0xFF0000)
            interaction.editReply({embeds: [embed], ephemeral: true}).catch(err => {console.error(err)});
            return;
        };
        Promise.all([phFunction.getCategoryID(interaction), phFunction.getPoliceRoles(interaction)]).then(async promiseResult => {
            var getCategoryID = promiseResult[0];
            var getPoliceRolesID = promiseResult[1];
            if(!await phFunction.checkPermission(interaction)) {
                const embed = new Discord.EmbedBuilder()
                 .setDescription('⛔ You don\'t have Permission to do this! `Need Police role or administrator!`')
                 .setColor(0xFF0000)
                interaction.editReply({embeds: [embed], ephemeral: true}).catch(err => {console.error(err)});
                return;
            }; 
            phFunction.checkCategory(interaction, getCategoryID, getPoliceRolesID);
            jailrolesfunctionlist.findOne({GuildID: interaction.guild.id}).then(async isFunctionEnable => {
                premiumlist.findOne({GuildID : interaction.guild.id }).then(async premiumserver => {
                    const premiumexpireembed = new Discord.EmbedBuilder()
                    .setDescription(`⚠️ This command allows only **premium** server!`)
                    .setColor(0xFFCC00)
                    if(!premiumserver && isFunctionEnable) return jailrolesfunctionlist.deleteOne(isFunctionEnable).then(() => {console.log(`{JAILROLES} REMOVED ${interaction.guild.name}(${interaction.guild.id}): Non premium why they can use?`)}, interaction.editReply({embeds: [premiumexpireembed], ephemeral: true}));
                    if(premiumserver && premiumserver.Expire < Date.now() && isFunctionEnable) return jailrolesfunctionlist.deleteOne(isFunctionEnable).then(() => {console.log(`{JAILROLES} REMOVED ${interaction.guild.name}(${interaction.guild.id}): Time out`)}, interaction.editReply({embeds: [premiumexpireembed], ephemeral: true}));
                    if(!premiumserver) {
                        interaction.editReply({embeds: [premiumexpireembed], ephemeral: true}).catch(err => {console.error(err)});
                        return;
                    };
                    if(!isFunctionEnable) {
                        const embed = new Discord.EmbedBuilder()
                         .setDescription(`❌ This command has been **disabled!**`)
                         .setFooter({text: `Your server need to enable this command first before executing this command again`})
                         .setColor(0xFF0000)
                        interaction.editReply({embeds: [embed], ephemeral: true}).catch(err => {console.error(err)});
                        return;
                    };
                    let roletarget = interaction.guild.roles.cache.get(interaction.options.getRole('role').id);
                    let chtarget = interaction.guild.channels.cache.get(interaction.options.getChannel('prison').id);
                    if(!roletarget) {
                        const embed = new Discord.EmbedBuilder()
                         .setDescription('💬 You need to specify `@role` after command!')
                         .setColor(0x00FFFF)
                        interaction.editReply({embeds: [embed], ephemeral: true}).catch(err => {console.error(err)});
                        return;
                    };
                    if(!chtarget) {
                        const embed = new Discord.EmbedBuilder()
                        .setDescription('💬 You need to specify `@channel` after command!')
                        .setColor(0x00FFFF)
                        interaction.editReply({embeds: [embed], ephemeral: true}).catch(err => {console.error(err)});
                        return;
                    };
                    if(!chtarget.permissionsFor(interaction.guild.members.me.user.id).has(Discord.PermissionFlagsBits.ViewChannel)) {
                        const embed = new Discord.EmbedBuilder()
                         .setDescription('⚠️ I Don\'t have Permission to do that! `No Permission in Target Channel!`')
                         .setColor(0xFFCC00)
                         interaction.editReply({embeds: [embed], ephemeral: true}).catch(err => {console.error(err)});
                        return;
                    };
                    if(chtarget.parent.id !== getCategoryID || !chtarget.parent) {
                        const embed = new Discord.EmbedBuilder()
                         .setDescription('⚠️ You can\'t add to another category! `Not in prison catetory`')
                         .setColor(0xFFCC00)
                         interaction.editReply({embeds: [embed], ephemeral: true}).catch(err => {console.error(err)});
                        return;
                    };
                    if(chtarget.type !== Discord.ChannelType.GuildText) {
                        const embed = new Discord.EmbedBuilder()
                         .setDescription('⚠️ Can\'t add to ' + chtarget.toString() + '`Not text channel`')
                         .setColor(0xFFCC00)
                         interaction.editReply({embeds: [embed], ephemeral: true}).catch(err => {console.error(err)});
                        return;
                    };
                    let successarrest = 0; 
                    let jailrolesForEachCount = 0; 
                    const targetArray = [];
                    let userFetch = await interaction.guild.members.fetch();
                    userFetch.forEach(async user => {
                        if(user.roles.cache.some(s => s.id === roletarget.id)) targetArray.push(user.user.id);
                    });
                    if(targetArray.length > 50) {
                        const embed = new Discord.EmbedBuilder()
                        .setDescription(`⚠️ <@&${roletarget.id}> has members > 50 members!`)
                        .setColor(0xFFCC00)
                        interaction.editReply({embeds: [embed], ephemeral: true}).catch(err => {console.error(err)});
                       return;
                    };
                    const successarrestsend = new Discord.EmbedBuilder()
                    .setDescription(`⌛ I'm arresting **${targetArray.length}** members!`)
                    .setColor(0x00FFFF)
                    .setFooter({text: `${interaction.user.tag} | REQUESTED`, iconURL: interaction.user.avatarURL({size: 1024})})
                    interaction.editReply({embeds: [successarrestsend]}).catch(err => {console.error(err)});
                    targetArray.forEach(async (target) => {
                        jailrolesForEachCount = jailrolesForEachCount + 1;
                        if(interaction.guild.members.cache.get(target).id === interaction.guild.members.me.user.id) return;
                        if(interaction.guild.members.cache.get(target).id === interaction.user.id) return;
                        if(interaction.guild.members.cache.get(target).user.bot) return;
                        let jailAdmindata = jailAdmin.findOne({GuildID: interaction.guild.id});
                        jailAdmindata.then(async jailAdminFunction => { // Check JailAdmin Function
                            if(jailAdminFunction && interaction.guild.members.me.roles.cache.find(r => r.guild.roles.client).position != interaction.guild.roles.highest.position && interaction.guild.members.cache.get(target).permissions.has(Discord.PermissionFlagsBits.Administrator)) return;
                            if(!jailAdminFunction && interaction.guild.members.cache.get(target).permissions.has(Discord.PermissionFlagsBits.Administrator)) return;        
                            if(await phFunction.checkPolice(interaction, interaction.guild.members.cache.get(target))) return;
                            jailuserlist.findOne({UserID : interaction.guild.members.cache.get(target).id, GuildID: interaction.guild.id}).then(async isJailed => {
                                if(isJailed) return;
                                if(!isJailed) {
                                    if(jailAdminFunction) {
                                        if(interaction.guild.members.cache.get(target).user.id === interaction.guild.ownerId) return;
                                    };
                                    let chtarget = (interaction.options.getChannel('channel')) ? interaction.guild.channels.cache.get(interaction.options.getChannel('channel').id) : undefined;
                                    if(chtarget) {
                                        if(!chtarget.permissionsFor(interaction.guild.members.me.user.id).has(Discord.PermissionFlagsBits.ViewChannel)) {
                                            const embed = new Discord.EmbedBuilder()
                                            .setDescription(interaction.user.toString() + ' ⚠️ I Don\'t have Permission to do that! `No Permission in Target Channel!`')
                                            .setColor(0xFFCC00)
                                            interaction.channel.send({embeds: [embed]})
                                            return;
                                        };
                                        if(!interaction.guild.members.cache.get(target)) {
                                            const embed = new Discord.EmbedBuilder()
                                            .setDescription(interaction.user.toString() + ' ⚠️ You can\'t add permission to that user! `Can\'t find in this server` ')
                                            .setColor(0xFFCC00)
                                            interaction.channel.send({embeds: [embed]});
                                            return;
                                        };
                                        if(!chtarget.parent || chtarget.parent.id !== getCategoryID) {
                                            const embed = new Discord.EmbedBuilder()
                                            .setDescription(interaction.user.toString() + ' ⚠️ You can\'t add to another category! `Not in prison catetory`')
                                            .setColor(0xFFCC00)
                                            interaction.channel.send({embeds: [embed]});
                                            return;
                                        };
                                        if(chtarget.type !== Discord.ChannelType.GuildText) {
                                            const embed = new Discord.EmbedBuilder()
                                            .setDescription(interaction.user.toString() + '⚠️ Can\'t add to ' + chtarget.toString() + '`Not text channel`')
                                            .setColor(0xFFCC00)
                                            interaction.channel.send({embeds: [embed]});
                                            return;
                                        };
                                    };
                                    try {
                                        const promiseit = [];
                                        for(const channel of interaction.guild.channels.cache.values()) {
                                            if(channel.permissionsFor(interaction.guild.members.me.user.id).has(Discord.PermissionFlagsBits.ViewChannel)) {
                                                promiseit.push(channel.permissionOverwrites.edit(interaction.guild.members.cache.get(target).id, {ViewChannel: false,  SendMessages: false}));
                                            };
                                        };
                                        Promise.all(promiseit).catch(err => console.log(interaction.user.tag + 'Promiseit Failed!' + err))
                                    } catch(err) {
                                        console.log(`promiseit(jail) failed with error ${err}`);
                                    };
                                if(chtarget) {
                                    chtarget.permissionOverwrites.edit(interaction.guild.members.me.user.id, {ViewChannel: true,  SendMessages: true});
                                    chtarget.permissionOverwrites.edit(interaction.guild.roles.everyone, {ViewChannel: false});
                                    chtarget.permissionOverwrites.edit(interaction.guild.members.cache.get(target).id, {ViewChannel: true,  SendMessages: true})
                                    chtarget.permissionOverwrites.edit(interaction.user.id, {ViewChannel: true,  SendMessages: true});
                                    if(getPoliceRolesID == undefined) {
                                        getPoliceRolesID = (interaction.guild.roles.cache.find(r => r.name.toLowerCase().includes('police'))) ? [interaction.guild.roles.cache.find(r => r.name.toLowerCase().includes('police'))] : [];
                                    };
                                    getPoliceRolesID.forEach(async (role) => {
                                        await chtarget.permissionOverwrites.edit(role, {ViewChannel: true});
                                    });
                                    const jailfinish = new Discord.EmbedBuilder()
                                    .setTitle('🔒 '+ ' Court')
                                    .setDescription('💬 ' + interaction.guild.members.cache.get(target).toString() + ' was Jailed!')
                                    .setFooter({text: 'Jailed by ' + interaction.user.tag, iconURL: interaction.user.avatarURL({size: 1024})})
                                    .setColor(0x00FFFF)
                                    .setTimestamp()
                                   chtarget.send({embeds: [jailfinish]}).catch(err => {console.log(`Error while chtarget sending jail due ${err}`)}) 
                                };
                                if(!chtarget) {
                                interaction.guild.channels.create({name: `${interaction.guild.members.cache.get(target).user.tag}`, type: Discord.ChannelType.GuildText}).then(async channel => {
                                    await channel.permissionOverwrites.edit(interaction.guild.members.me.user.id, {ViewChannel: true,  SendMessages: true, ManageChannels: true});
                                    await channel.setParent(interaction.guild.channels.cache.find(ch => ch.id === getCategoryID && ch.type === Discord.ChannelType.GuildCategory) ? interaction.guild.channels.cache.find(ch => ch.id === getCategoryID && ch.type === Discord.ChannelType.GuildCategory) : interaction.guild.channels.cache.find(ch => ch.name.toLowerCase().includes('prison') && ch.type === Discord.ChannelType.GuildCategory));
                                    await channel.permissionOverwrites.edit(interaction.guild.roles.everyone, {ViewChannel: false});
                                    await channel.permissionOverwrites.edit(interaction.guild.members.cache.get(target).id, {ViewChannel: true,  SendMessages: true})
                                    await channel.permissionOverwrites.edit(interaction.user.id, {ViewChannel: true,  SendMessages: true});
                                    if(getPoliceRolesID == undefined) {
                                        getPoliceRolesID = (interaction.guild.roles.cache.find(r => r.name.toLowerCase().includes('police'))) ? [interaction.guild.roles.cache.find(r => r.name.toLowerCase().includes('police'))] : [];
                                    };
                                    getPoliceRolesID.forEach(async (role) => {
                                        await channel.permissionOverwrites.edit(role, {ViewChannel: true});
                                    })
                                    await channel.setTopic(interaction.guild.members.cache.get(target).user.id)
                                    const jailfinish = new Discord.EmbedBuilder()
                                    .setTitle('🔒 '+ ' Court')
                                    .setDescription('💬 ' + interaction.guild.members.cache.get(target).toString() + ' was Jailed!')
                                    .setFooter({text: 'Jailed by ' + interaction.user.tag, iconURL: interaction.user.avatarURL({size: 1024})})
                                    .setColor(0x00FFFF)
                                    .setTimestamp()
                                   channel.send({embeds: [jailfinish]});
                                });
                            };
                                function logsData(logsMessage) { //logs function
                                    try {                
                                        interaction.guild.channels.cache.forEach(channel => {
                                            if(channel.parent && channel.parent.id === getCategoryID && channel.name.toLowerCase().includes('logs') && channel.type === Discord.ChannelType.GuildText) {
                                                if(channel.permissionsFor(interaction.guild.members.me.user.id).has(Discord.PermissionFlagsBits.SendMessages && Discord.PermissionFlagsBits.ViewChannel)) {
                                                setTimeout(() => channel.send(logsMessage), 3000);
                                                };
                                            };
                                            });                
                                        } catch(err) {                  
                                            console.log(`jail-roles logs error ${err}`);      
                                        };
                                };
                                const jailfinish = new Discord.EmbedBuilder()
                                .setTitle('🔒 '+ ' Court')
                                .setDescription('💬 ' + interaction.guild.members.cache.get(target).toString() + ' was Jailed!')
                                 .setFooter({text: 'Jailed by ' + interaction.user.tag, iconURL: interaction.user.avatarURL({size:1024})})
                                 .setThumbnail(interaction.guild.members.cache.get(target).user.avatarURL({size: 1024}))
                                 .setColor(0x00FFFF)
                                 .setTimestamp()
                                interaction.channel.send({embeds: [jailfinish]})
                                
                                logsData({embeds: [jailfinish]});
                            
                            
                                const jailmessage = new Discord.EmbedBuilder()
                                .setAuthor({name: 'Server: ' + interaction.guild.name, iconURL: interaction.guild.iconURL({size: 2048})})
                                 .setDescription('💬 You are being prisoner now!')
                                 .setColor(0x00FFFF)
                                 .setFooter({text: 'Jailed by ' + interaction.user.tag, iconURL: interaction.user.avatarURL({size:1024})})
                                 .setTimestamp()
                                interaction.guild.members.cache.get(target).send({embeds: [jailmessage]}).catch(err => {console.log(`Error while sending jailmessage to ${interaction.guild.members.cache.get(target).tag} due ${err}`)})
                                let dbreason = interaction.options.getString('reason') ? interaction.options.getString('reason') : 'none';
                                if(!jailAdminFunction) {
                                    let jailJson = {
                                        UserID: interaction.guild.members.cache.get(target).id,
                                        GuildID: interaction.guild.id,
                                        reason: dbreason,
                                    };
                                    let newJailUserData = new jailuserlist(jailJson);
                        
                                    newJailUserData.save().then(console.log(`{Jail+} ADD ${interaction.guild.members.cache.get(target).user.tag} into database!`), successarrest = successarrest + 1);
                                };
                                if(jailAdminFunction) {
                                    let roleAll = interaction.guild.members.cache.get(target).roles.cache.map(r => r.id)
                                    roleAll.forEach((role) => {
                                        if(!role) return;
                                        if(interaction.guild.roles.cache.get(role) == interaction.guild.roles.everyone.id) return;
                                        if(!interaction.guild.roles.cache.get(role)) return;
                                        interaction.guild.members.cache.get(target).roles.remove(role).then(console.log(`Removed all roles of ${interaction.guild.members.cache.get(target).user.tag} !`)).catch(err => console.log(`Can\'t removed all user roles due ${err}`));
                                    });
                                    let jailJson = {
                                        UserID: interaction.guild.members.cache.get(target).id,
                                        GuildID: interaction.guild.id,
                                        UserRoles: roleAll,
                                        reason: dbreason,
                                    };
                                    let newJailUserData = new jailuserlist(jailJson);
                        
                                    newJailUserData.save().then(console.log(`{Jail+} ADD ${interaction.guild.members.cache.get(target).user.tag} into database! + jailAdmin Function`), successarrest = successarrest + 1)
                                };
                            
                                console.log('[^] JAILED ' + interaction.guild.members.cache.get(target).user.tag + `(${interaction.guild.members.cache.get(target).id})` + ' at ' + interaction.guild.name )
                            };
                        });
                        });
                    });
                    return;
                });
            });
        });
    }
};
