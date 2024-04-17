const Discord = require('discord.js');
const phFunction = require('../function/main.js');
const muteuserlist = require('../models/muteuserlist-profile-schema');
const ms = require('ms');
const prettyMilliseconds = require('pretty-ms');

module.exports = {
    data: new Discord.SlashCommandBuilder()
    .setName('mute')
    .setDescription('Mute the user')
    .addStringOption(o=>o.setName('user').setDescription('mention user or specify user id').setRequired(true))
    .addIntegerOption(o => o.setName('hour').setDescription('specify time if you want').setMinValue(1).setMaxValue(48))
    .addIntegerOption(o => o.setName('minute').setDescription('specify time if you want').setMinValue(1).setMaxValue(60))
    .addIntegerOption(o => o.setName('second').setDescription('specify time if you want').setMinValue(1).setMaxValue(60)),
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
                 interaction.editReply({embeds: [embed], ephemeral: true}).catch(err => {console.error(err)});
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
            targetArray.forEach(async (target2) => {
                let target = interaction.guild.members.cache.get(target2);
                if(target.id === interaction.guild.members.me.user.id) {
                    const embed = new Discord.EmbedBuilder()
                     .setDescription(interaction.user.toString()+'⚠️ I can\'t mute myself')
                     .setColor(0xFFCC00)
                    interaction.channel.send({embeds: [embed]});
                    return;
                };
            
                if(target.id === interaction.user.id) {
                    const embed = new Discord.EmbedBuilder()
                     .setDescription(interaction.user.toString()+'⚠️ You can\'t mute yourself!')
                     .setColor(0xFFCC00)
                     interaction.channel.send({embeds: [embed]});
                    return;
                };
            
                if(target.permissions.has(Discord.PermissionFlagsBits.Administrator)) {
                    const embed = new Discord.EmbedBuilder()
                     .setDescription(interaction.user.toString() + '⚠️ I Can\'t Mute ' + target.toString() + ' : Admin')
                     .setColor(0xFFCC00)
                     interaction.channel.send({embeds: [embed]});
                    return;
                };
                if(await phFunction.checkPolice(interaction, target)) {
                    const embed = new Discord.EmbedBuilder()
                     .setDescription(interaction.user.toString() + '⚠️ You can\'t Mute ' + target.toString() + ' : Police')
                     .setColor(0xFFCC00)
                     interaction.channel.send({embeds: [embed]});
                    return;
                };
                muteuserlist.findOne({UserID : target.id, GuildID: interaction.guild.id}).then(async isMuted => {
                    if(isMuted) {
                        const embed = new Discord.EmbedBuilder()
                        .setDescription(interaction.user.toString()+'💬 ' + target.toString() + ' is already muted!')
                        .setColor(0x00FFFF)
                        interaction.channel.send({embeds: [embed]});
                       return;
                    };
                    if(!isMuted) {
                        try {
                            const promiseot = [];
                            for(const channel of interaction.guild.channels.cache.values()) {
                                if(channel.permissionsFor(interaction.guild.members.me.user.id).has(Discord.PermissionFlagsBits.ViewChannel && Discord.PermissionFlagsBits.ManageChannels) && channel.permissionOverwrites) {
                                    promiseot.push(channel.permissionOverwrites.edit(target.id, {SendMessages: false, Speak: false}));
                                };
                            };
                            Promise.all(promiseot).catch(err => console.log(interaction.user.tag + 'Promise mute Failed!' + err));
                        } catch(err) {
                            console.log(`promiseot error -> ${err}`);
                        }
                        let finalTimeDisplay = (finalTime >= 10000) ? `\nTime: \`${prettyMilliseconds(finalTime, {verbose: true})}\`` : ``;
                        const mutefinish = new Discord.EmbedBuilder()
                        .setTitle('🏥 ' + ' Hospital')
                        .setDescription('💬 ' + target.toString() + ' was muted!' + finalTimeDisplay)
                        .setThumbnail(target.user.avatarURL({size: 1024}))
                        .setFooter({text: 'Muted by ' + interaction.user.tag , iconURL: interaction.user.avatarURL({size: 1024})})
                        .setColor(0x00FFFF)
                        .setTimestamp()
                        interaction.channel.send({embeds: [mutefinish]});
                        console.log('Muted ' + target.user.tag + `(${target.user.id})` + ' at ' + interaction.guild.name + `(${interaction.guild.id})`);
                        let muteJson = {
                            UserID: target.user.id,
                            GuildID: interaction.guild.id
                        };
                        if(finalTime >= 10000) {
                            muteJson = {
                                UserID: target.user.id,
                                GuildID: interaction.guild.id,
                                muteTime: `${Math.floor(Date.now() + finalTime)}`,
                            };
                        };
                        let newMuteUserData = new muteuserlist(muteJson);

                        newMuteUserData.save().then(console.log(`{Mute+} ADD ${target.user.tag} ${target.user.id} into database!`));
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
                                console.log(`mute logs error ${err}`);      
                                };
                        };
                        logsData({embeds: [mutefinish]});
                    };
                });
            });
        });
    }
};
