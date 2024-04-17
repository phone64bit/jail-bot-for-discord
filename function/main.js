const serverSettingslist = require('../models/settings-server-schema');
const Discord = require('discord.js');
// ============================================================================================================= //
// LASTPOLICEROLESLIST
module.exports.getPoliceRoles = function (handler) {
    return new Promise(resolve => {
        serverSettingslist.findOne({guildID: handler.guild.id}).then(async getServerSettings => {
            let svpoliceroleslist = []; let dbpoliceroleslist = [];
            if(handler.guild.roles.cache.find(r => r.name.toLowerCase().includes('police'))) {
                handler.guild.roles.cache.filter(r => r.name.toLowerCase().includes('police')).forEach(rolesdocs => {
                    svpoliceroleslist.push(`${rolesdocs.id}`)
                });
            } else {
                svpoliceroleslist = undefined;
            };
            if(getServerSettings && getServerSettings.policeRolesID && getServerSettings.policeRolesID.length > 0) {
                getServerSettings.policeRolesID.forEach(rolesdocs => {
                    if(!handler.guild.roles.cache.get(`${rolesdocs}`)) {
                        serverSettingslist.updateOne({guildID: handler.guild.id}, {$pull : { policeRolesID : rolesdocs } }).then(console.log(`[=[/]=] Update DB policeRolesID Remove roles ID: ${rolesdocs} due can't find this role in server ${handler.guild.name}(${handler.guild.id})`));
                    } else {
                        if(handler.guild.roles.cache.get(`${rolesdocs}`).permissions.has(Discord.PermissionFlagsBits.Administrator)) {
                            serverSettingslist.updateOne({guildID: handler.guild.id}, {$pull : { policeRolesID : rolesdocs } }).then(console.log(`[=[/]=] Update DB policeRolesID Remove roles ID: ${rolesdocs} due have ADMINISTRATOR PERMISSION ${handler.guild.name}(${handler.guild.id})`)); 
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
                handler.guild.roles.create({
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
module.exports.getCategoryID = function (handler) {
    return new Promise(resolve => {
        serverSettingslist.findOne({guildID: handler.guild.id}).then(async getServerSettings => {
            if(!getServerSettings || getServerSettings && !getServerSettings.prisonCategoryID) {
                if(handler.guild.channels.cache.find(ch => ch.name.toLowerCase().includes('prison') && ch.type === Discord.ChannelType.GuildCategory)) {
                    if(handler.guild.channels.cache.find(ch => ch.name.toLowerCase().includes('prison') && ch.type === Discord.ChannelType.GuildCategory).permissionsFor(handler.guild.members.me.user.id).has(Discord.PermissionFlagsBits.ManageChannels && Discord.PermissionFlagsBits.ViewChannel)) {
                        resolve(handler.guild.channels.cache.find(ch => ch.name.toLowerCase().includes('prison') && ch.type === Discord.ChannelType.GuildCategory).id);
                    } else {
                        if(getServerSettings && getServerSettings.prisonCategoryID) serverSettingslist.updateOne({guildID: handler.guild.id}, { $unset: {prisonCategoryID : getServerSettings.prisonCategoryID } }).then(console.log(`[serverSettings] $unset prisonCategoryID -> ${handler.guild.name}(${handler.guild.id}) due can't access prison category channel in server.`));
                        if(handler === "interaction") {
                            handler.editReply({content: `❌ I can't access **#${handler.guild.channels.cache.find(ch => ch.name.toLowerCase().includes('prison') && ch.type === Discord.ChannelType.GuildCategory).name}**: don't have permission to view channel & manage channels`, ephemeral: true});
                        } else {
                            handler.channel.send(`❌ I can't access **#${handler.guild.channels.cache.find(ch => ch.name.toLowerCase().includes('prison') && ch.type === Discord.ChannelType.GuildCategory).name}**: don't have permission to view channel & manage channels`);
                        };
                        resolve(false);
                        
                    }
                } else {
                    resolve(false);
                };
            };
            if(getServerSettings && getServerSettings.prisonCategoryID) {
                if(handler.guild.channels.cache.find(ch => ch.id == getServerSettings.prisonCategoryID && ch.type === Discord.ChannelType.GuildCategory)) {
                    if(handler.guild.channels.cache.find(ch => ch.id == getServerSettings.prisonCategoryID && ch.type === Discord.ChannelType.GuildCategory).permissionsFor(handler.guild.members.me.user.id).has(Discord.PermissionFlagsBits.ManageChannels && Discord.PermissionFlagsBits.ViewChannel)) {
                        resolve(getServerSettings.prisonCategoryID);
                    } else {
                        if(getServerSettings && getServerSettings.prisonCategoryID) serverSettingslist.updateOne({guildID: handler.guild.id}, { $unset: {prisonCategoryID : getServerSettings.prisonCategoryID } }).then(console.log(`[serverSettings] $unset prisonCategoryID -> ${handler.guild.name}(${handler.guild.id}) due can't access prison category channel in server.`));
                        if(handler === "interaction") {
                            handler.reply({content: `❌ I can't access **#${handler.guild.channels.cache.find(ch => ch.id == getServerSettings.prisonCategoryID && ch.type === Discord.ChannelType.GuildCategory).name}**: don't have permission to view channel & manage channels`, ephemeral: true});
                        } else {
                            handler.channel.send(`❌ I can't access **#${handler.guild.channels.cache.find(ch => ch.id == getServerSettings.prisonCategoryID && ch.type === Discord.ChannelType.GuildCategory).name}**: don't have permission to view channel & manage channels`);
                        };
                        resolve(false);
                        
                    }
                } else {
                    if(getServerSettings && getServerSettings.prisonCategoryID) serverSettingslist.updateOne({guildID: handler.guild.id}, { $unset: {prisonCategoryID : getServerSettings.prisonCategoryID } }).then(console.log(`[serverSettings] $unset prisonCategoryID -> ${handler.guild.name}(${handler.guild.id}) due can't get channel id in server.`));
                    resolve(false);
                }
            }
        });
    }, 1000);
};
// ============================================================================================================= //
// checkCategory
module.exports.checkCategory = function(handler, getCategoryID, getPoliceRolesID) {
    if(getCategoryID == false) {
        handler.guild.channels.create({type: Discord.ChannelType.GuildCategory, name: '۩ PRISON ۩'}).then(async channel => {
            await channel.permissionOverwrites.edit(handler.guild.members.me.user.id, {ViewChannel: true, ManageChannels: true, SendMessages: true});
            await channel.permissionOverwrites.edit(handler.guild.roles.everyone, {ViewChannel: false});
            if(getPoliceRolesID == undefined) getPoliceRolesID = (handler.guild.roles.cache.find(r => r.name.toLowerCase().includes('police'))) ? [handler.guild.roles.cache.find(r => r.name.toLowerCase().includes('police'))] : [];
            getPoliceRolesID.forEach(async (role) => { await channel.permissionOverwrites.edit(role, {ViewChannel: true}); });
            return getCategoryID = channel.id;
        });
    };
    if(!handler.guild.channels.cache.find(ch => ch.name.toLowerCase().includes('logs') && ch.parent && ch.parent.id === getCategoryID)) {
        handler.guild.channels.create({type: Discord.ChannelType.GuildText, name: 'logs'}).then(async channel => {
            await channel.permissionOverwrites.edit(handler.guild.members.me.user.id, {ViewChannel: true, ManageChannels: true, SendMessages: true})
            await channel.setParent(handler.guild.channels.cache.find(ch => ch.id=== getCategoryID && ch.type === Discord.ChannelType.GuildCategory) ? handler.guild.channels.cache.find(ch => ch.id=== getCategoryID && ch.type === Discord.ChannelType.GuildCategory) : handler.guild.channels.cache.find(ch => ch.name.toLowerCase().includes('prison') && ch.type === Discord.ChannelType.GuildCategory));
            await channel.permissionOverwrites.edit(handler.guild.roles.everyone, {ViewChannel: false});
            if(getPoliceRolesID == undefined) getPoliceRolesID = (handler.guild.roles.cache.find(r => r.name.toLowerCase().includes('police'))) ? [handler.guild.roles.cache.find(r => r.name.toLowerCase().includes('police'))] : [];
            getPoliceRolesID.forEach(async (role) => { await channel.permissionOverwrites.edit(role, {ViewChannel: true}); });
        });
    }; 
};
// ============================================================================================================= //
module.exports.checkPermission = function(handler) {
    return new Promise(resolve => {
        Promise.all([this.getPoliceRoles(handler)]).then(async promiseResult => {
            function checkPolice(member) {
                return promiseResult[0] != undefined && member.roles.cache.filter(fn => fn.id != fn.guild.roles.everyone.id).some(s => promiseResult[0].includes(s.id)) ? true : false;
            };
            resolve(checkPolice(handler.member) == false && !handler.member.permissions.has(Discord.PermissionFlagsBits.Administrator) ? false : true);
        });
    });
};
// ============================================================================================================= //
module.exports.checkPolice = function(handler, target) {
    return new Promise(resolve => {
        Promise.all([this.getPoliceRoles(handler)]).then(async promiseResult => {
            function __checkPolice(member) {
                return promiseResult[0] != undefined && member.roles.cache.filter(fn => fn.id != fn.guild.roles.everyone.id).some(s => promiseResult[0].includes(s.id)) ? true : false;
            };
            resolve(__checkPolice(target) == false ? false : true);
        });
    });
};
// ============================================================================================================= //
module.exports.delay = async (ms) => {
    return new Promise(resolve => {
        setTimeout(resolve, ms);
    });
};