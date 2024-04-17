const Discord = require('discord.js');
const ms = require('ms');
const phFunction = require('../function/main.js');
const jailAdmin = require('../models/settings-jailAdmin-schema');
const jailuserlist = require('../models/jailuserlist-profile-schema');
const prettyMilliseconds = require('pretty-ms');

module.exports = {
    data: new Discord.SlashCommandBuilder()
    .setName('jail')
    .setDescription('Jail a specify user')
    .addStringOption(o => o.setName('user').setDescription('mention user(s) or specify user(s) id').setRequired(true))
    .addIntegerOption(o => o.setName('hour').setDescription('specify time if you want').setMinValue(1).setMaxValue(48))
    .addIntegerOption(o => o.setName('minute').setDescription('specify time if you want').setMinValue(1).setMaxValue(60))
    .addIntegerOption(o => o.setName('second').setDescription('specify time if you want').setMinValue(1).setMaxValue(60))
    .addChannelOption(o => o.setName('channel').setDescription('jail user(s) in specify channel'))
    .addStringOption(o => o.setName('reason').setDescription('add the reason')),
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
            const targetArray = [];
            const failedFetch = [];
            try {
                interaction.options.getString('user').trim().split(/ +/g).forEach((target) => {
                    if(!target) return;
                    if(target.startsWith('<@') && target.endsWith('>')) { target = target.slice(2, -1); };
                    if(target.startsWith('!')) { target = target.slice(1); };
                    if(!interaction.guild.members.cache.get(target)) {
                        failedFetch.push(target);
                        return;
                    };
                    if(targetArray.some(x => x == interaction.guild.members.cache.get(target).id)) return;
                    targetArray.push(interaction.guild.members.cache.get(target).id);
                });
            } catch {
                targetArray = [];
                interaction.editReply({
                    content: "An error occurred while executing the command, Please try again !",
                    ephemeral: true,
                }).catch(err => {console.error(err)});
            };
            if(targetArray.length < 1 && failedFetch.length < 1) {
                const embed = new Discord.EmbedBuilder()
                .setDescription('💬 You need to specify `@user` or `user id` after command!')
                .setColor(0x00FFFF)
                interaction.editReply({embeds: [embed], ephemeral: true}).catch(err => {console.error(err)});
                return;
            };
            if(failedFetch.length > 0) {
                const embed = new Discord.EmbedBuilder()
                 .setDescription(`Can\'t find \`${failedFetch.join(' & ')}\` in this server`)
                 .setColor(0xFFCC00)
                 interaction.channel.send({embeds: [embed], ephemeral: true}).catch(err => {console.error(err)});
            };
            if(targetArray.length > 5) {
                const embed = new Discord.EmbedBuilder()
                 .setDescription(`⚠️ You must specify user no more than 5 members!`)
                 .setColor(0xFFCC00)
                 interaction.editReply({embeds: [embed], ephemeral: true}).catch(err => {console.error(err)});
                 return;
            };
            let finalTime = 0;
            if(interaction.options.getInteger('hour')) finalTime = finalTime + ms(`${interaction.options.getInteger('hour')} hour`);
            if(interaction.options.getInteger('minute')) finalTime = finalTime + ms(`${interaction.options.getInteger('minute')} minute`);
            if(interaction.options.getInteger('second')) finalTime = finalTime + ms(`${interaction.options.getInteger('second')} second`);
            if(finalTime != 0 && finalTime < 10000) {
                const embed = new Discord.EmbedBuilder()
                .setDescription('💬 You need to specify time greater than 9 seconds')
                .setColor(0x00FFFF)
                interaction.editReply({embeds: [embed], ephemeral: true}).catch(err => {console.error(err)});
               return;
            };
            targetArray.forEach((target2) => {
                let target = interaction.guild.members.cache.get(target2);
                if(!target) {
                    interaction.channel.send({content: `❌ An error was occurred, please try again.`});
                    return;
                };
                if(target.id === interaction.guild.members.me.user.id) {
                    const embed = new Discord.EmbedBuilder()
                     .setDescription(interaction.user.toString() + ' ⚠️ I can\'t jail myself')
                     .setColor(0xFFCC00)
                     interaction.channel.send({embeds: [embed]});
                    return;
                };           
                if(target.id === interaction.user.id) {
                    const embed = new Discord.EmbedBuilder()
                     .setDescription(interaction.user.toString() + ' ⚠️ You can\'t jail yourself!')
                     .setColor(0xFFCC00)
                     interaction.channel.send({embeds: [embed]});
                    return;
                };
                if(target.user.bot) {
                    const embed = new Discord.EmbedBuilder()
                     .setDescription(interaction.user.toString() + ' ⚠️ You can\'t jail bot')
                     .setColor(0xFFCC00)
                     interaction.channel.send({embeds: [embed]});
                    return;
                };
                let jailAdmindata = jailAdmin.findOne({GuildID: interaction.guild.id});
                jailAdmindata.then(async jailAdminFunction => { // Check JailAdmin Function
                    if(jailAdminFunction && interaction.guild.members.me.roles.cache.find(r => r.guild.roles.client).position != interaction.guild.roles.highest.position && target.permissions.has(Discord.PermissionFlagsBits.Administrator)) {
                        const embed = new Discord.EmbedBuilder()
                        .setDescription(interaction.user.toString() + '⚠️ I can\'t jail ' + target.toString() + ' : Admin')
                        .setColor(0xFFCC00)
                        await jailAdmin.deleteOne(jailAdminFunction).then(interaction.channel.send({embeds: [embed]}));
                        return;
                    };
                    if(!jailAdminFunction && target.permissions.has(Discord.PermissionFlagsBits.Administrator)) {
                        const embed = new Discord.EmbedBuilder()
                         .setDescription(interaction.user.toString() + '⚠️ I can\'t jail '+ target.toString()+' : Admin')
                         .setColor(0xFFCC00)
                         interaction.channel.send({embeds: [embed]});
                        return;
                    };
                    if(await phFunction.checkPolice(interaction, target)) {
                        const embed = new Discord.EmbedBuilder()
                        .setDescription(interaction.user.toString() + '⚠️ You can\'t Jail '+ target.toString()+' : Police')
                        .setColor(0xFFCC00)
                        interaction.channel.send({embeds: [embed]})
                        return;
                    };
                    jailuserlist.findOne({UserID : target.id, GuildID: interaction.guild.id}).then(async isJailed => {
                        if(isJailed) {
                            const embed = new Discord.EmbedBuilder()
                                .setDescription(interaction.user.toString() + ' ⚠️  '+ target.toString()+' is already arrested!')
                                .setColor(0xFFCC00)
                                interaction.channel.send({embeds: [embed]});
                            return;
                        };
                        if(!isJailed) {
                            if(jailAdminFunction) {
                                if(target.user.id === interaction.guild.ownerId) {
                                    const embed = new Discord.EmbedBuilder()
                                    .setDescription(interaction.user.toString() + ' ⚠️ I can\'t jail '+ target.toString()+' : Owner')
                                    .setColor(0xFFCC00)
                                    interaction.channel.send({embeds: [embed]});
                                    return;
                                };
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
                                if(!target) {
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
                                    if(channel.permissionsFor(interaction.guild.members.me.user.id).has(Discord.PermissionFlagsBits.ViewChannel && Discord.PermissionFlagsBits.ManageChannels) && channel.permissionOverwrites) {
                                        promiseit.push(channel.permissionOverwrites.edit(target.id, {ViewChannel: false,  SendMessages: false}));
                                    };
                                };
                                Promise.all(promiseit).catch(err => console.log(interaction.user.tag + 'Promiseit Failed!' + err))
                            } catch(err) {
                                console.log(`promiseit(jail) failed with error ${err}`);
                            };
                            let finalReason = (interaction.options.getString('reason')) ? `\nReason: ${interaction.options.getString('reason')}` : `\n`;
                            let finalTimeDisplay = (finalTime >= 10000) ? `\nTime: \`${prettyMilliseconds(finalTime, {verbose: true})}\`` : ``;
                        if(chtarget) {
                            chtarget.permissionOverwrites.edit(interaction.guild.members.me.user.id, {ViewChannel: true,  SendMessages: true});
                            chtarget.permissionOverwrites.edit(interaction.guild.roles.everyone, {ViewChannel: false});
                            chtarget.permissionOverwrites.edit(target.id, {ViewChannel: true,  SendMessages: true})
                            chtarget.permissionOverwrites.edit(interaction.user.id, {ViewChannel: true,  SendMessages: true});
                            if(getPoliceRolesID == undefined) {
                                getPoliceRolesID = (interaction.guild.roles.cache.find(r => r.name.toLowerCase().includes('police'))) ? [interaction.guild.roles.cache.find(r => r.name.toLowerCase().includes('police'))] : [];
                            };
                            getPoliceRolesID.forEach(async (role) => {
                                await chtarget.permissionOverwrites.edit(role, {ViewChannel: true,  SendMessages: true});
                            });
                            const jailfinish = new Discord.EmbedBuilder()
                            .setTitle('🔒 '+ ' Court')
                            .setDescription('💬 ' + target.toString() + ' was Jailed!' + `${finalTimeDisplay}${finalReason}`)
                            .setFooter({text: 'Jailed by ' + interaction.user.tag, iconURL: interaction.user.avatarURL({size: 1024})})
                            .setColor(0x00FFFF)
                            .setTimestamp()
                           chtarget.send({embeds: [jailfinish]}).catch(err => {console.log(`Error while chtarget sending jail due ${err}`)}) 
                        };
                        if(!chtarget) {
                        interaction.guild.channels.create({name: `${target.user.tag}`, type: Discord.ChannelType.GuildText}).then(async channel => {
                            await channel.permissionOverwrites.edit(interaction.guild.members.me.user.id, {ViewChannel: true,  SendMessages: true, ManageChannels: true});
                            await channel.setParent(interaction.guild.channels.cache.find(ch => ch.id === getCategoryID && ch.type === Discord.ChannelType.GuildCategory) ? interaction.guild.channels.cache.find(ch => ch.id === getCategoryID && ch.type === Discord.ChannelType.GuildCategory) : interaction.guild.channels.cache.find(ch => ch.name.toLowerCase().includes('prison') && ch.type === Discord.ChannelType.GuildCategory));
                            await channel.permissionOverwrites.edit(interaction.guild.roles.everyone, {ViewChannel: false});
                            await channel.permissionOverwrites.edit(target.id, {ViewChannel: true,  SendMessages: true})
                            await channel.permissionOverwrites.edit(interaction.user.id, {ViewChannel: true,  SendMessages: true});
                            if(getPoliceRolesID == undefined) {
                                getPoliceRolesID = (interaction.guild.roles.cache.find(r => r.name.toLowerCase().includes('police'))) ? [interaction.guild.roles.cache.find(r => r.name.toLowerCase().includes('police'))] : [];
                            };
                            getPoliceRolesID.forEach(async (role) => {
                                await channel.permissionOverwrites.edit(role, {ViewChannel: true,  SendMessages: true});
                            })
                            await channel.setTopic(target.user.id)
                            const jailfinish = new Discord.EmbedBuilder()
                            .setTitle('🔒 '+ ' Court')
                            .setDescription('💬 ' + target.toString() + ' was Jailed!' + `${finalTimeDisplay}${finalReason}`)
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
                                    console.log(`jail logs error ${err}`);      
                                };
                        };
                        const jailfinish = new Discord.EmbedBuilder()
                        .setTitle('🔒 '+ ' Court')
                        .setDescription('💬 ' + target.toString() + ' was Jailed!' + `${finalTimeDisplay}${finalReason}`)
                         .setFooter({text: 'Jailed by ' + interaction.user.tag, iconURL: interaction.user.avatarURL({size:1024})})
                         .setThumbnail(target.user.avatarURL({size: 1024}))
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
                        target.send({embeds: [jailmessage]}).catch(err => {console.log(`Error while sending jailmessage to ${target.tag} due ${err}`)})
                        let dbreason = interaction.options.getString('reason') ? interaction.options.getString('reason') : 'none';
                        if(!jailAdminFunction) {
                            let jailJson = {
                                UserID: target.id,
                                GuildID: interaction.guild.id,
                                reason: dbreason,
                            };
                            if(finalTime >= 10000) {
                                jailJson = {
                                    UserID: target.id,
                                    GuildID: interaction.guild.id,
                                    reason: dbreason,
                                    jailTime: `${Math.floor(Date.now() + finalTime)}`,
                                };
                            };
                            let newJailUserData = new jailuserlist(jailJson);
                
                            newJailUserData.save().then(console.log(`{Jail+} ADD ${target.user.tag} into database!`));
                        };
                        if(jailAdminFunction) {
                            let roleAll = target.roles.cache.map(r => r.id)
                            roleAll.forEach((role) => {
                                if(!role) return;
                                if(interaction.guild.roles.cache.get(role) == interaction.guild.roles.everyone.id) return;
                                if(!interaction.guild.roles.cache.get(role)) return;
                                target.roles.remove(role).then(console.log(`Removed all roles of ${target.user.tag} !`)).catch(err => console.log(`Can\'t removed all user roles due ${err}`));
                            });
                            let jailJson = {
                                UserID: target.id,
                                GuildID: interaction.guild.id,
                                UserRoles: roleAll,
                                reason: dbreason,
                            };
                            if(finalTime >= 10000) {
                                jailJson = {
                                    UserID: target.id,
                                    GuildID: interaction.guild.id,
                                    UserRoles: roleAll,
                                    reason: dbreason,
                                    jailTime: `${Math.floor(Date.now() + finalTime)}`,
                                };
                            };
                            let newJailUserData = new jailuserlist(jailJson);
                
                            newJailUserData.save().then(console.log(`{Jail+} ADD ${target.user.tag} into database! + jailAdmin Function`))
                        };
                    
                        console.log('[^] JAILED ' + target.user.tag + `(${target.id})` + ' at ' + interaction.guild.name )
                    };
                });
                });
            });
        });
    }
};
