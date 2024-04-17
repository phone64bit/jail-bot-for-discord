const Discord = require('discord.js');
const phFunction = require('../function/main.js');
const muteuserlist = require('../models/muteuserlist-profile-schema');

module.exports = {
    data: new Discord.SlashCommandBuilder()
    .setName('unmute')
    .setDescription('Unmute the user')
    .addStringOption(o => o.setName('user').setDescription('mention user or specify user id').setRequired(true)),
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
            targetArray.forEach((target2) => {
                let target = interaction.guild.members.cache.get(target2);
                if(!target) {
                    interaction.channel.send({content: `❌ An error was occurred, please try again.`});
                    return;
                };
                if(target.id === interaction.guild.members.me.user.id) {
                    const embed = new Discord.EmbedBuilder()
                     .setDescription(interaction.user.toString()+'⚠️ I can\'t unmute myself')
                     .setColor(0xFFCC00)
                    interaction.channel.send({embeds: [embed]});
                    return;
                };
                if(target.id === interaction.user.id) {
                    const embed = new Discord.EmbedBuilder()
                     .setDescription(interaction.user.toString()+'⚠️ You can\'t unmute yourself!')
                     .setColor(0xFFCC00)
                     interaction.channel.send({embeds: [embed]});
                    return;
                };
                muteuserlist.findOne({UserID : target.id, GuildID: interaction.guild.id}).then(async isMuted => {
                    if(!isMuted) {
                        const embed = new Discord.EmbedBuilder()
                        .setDescription(interaction.user.toString()+' ⚠️ You Didn\'t Mute ' + target.toString())
                        .setColor(0x00FFCC)
                        interaction.channel.send({embeds: [embed]});
                       return;
                    };
                    if(isMuted) {
                        try {
                            const promiseot = [];
                            for(const channel of interaction.guild.channels.cache.values()) {
                                if(channel.permissionsFor(target.id).has(Discord.PermissionFlagsBits.SendMessages && Discord.PermissionFlagsBits.Speak) == false && channel.permissionsFor(target).has(Discord.PermissionFlagsBits.ManageChannels && Discord.PermissionFlagsBits.ViewChannel) && channel.permissionOverwrites) {
                                    promiseot.push(channel.permissionOverwrites.delete(target));
                                };
                            };
                            Promise.all(promiseot).catch(err => console.log(interaction.user.tag + 'Promise unmute Failed!' + err));
                        } catch(err) {
                            console.log(`promiseot failed with error ${err}`);
                        };  
                        const unmutefinish = new Discord.EmbedBuilder()
                        .setTitle('🏥 ' + ' Hospital')
                        .setDescription('💬 ' + target.toString() + ' was unmuted!')
                        .setThumbnail(target.user.avatarURL({size: 1024}))
                        .setFooter({text: 'Unmuted by ' + interaction.user.tag , iconURL: interaction.user.avatarURL({size: 1024})})
                        .setColor(0x00FFFF)
                        .setTimestamp()
                        interaction.channel.send({embeds: [unmutefinish]});
                        console.log('Unmuted ' + target.user.tag + `(${target.user.id})` + ' at ' + interaction.guild.name + `(${interaction.guild.id})`);
                        await muteuserlist.deleteOne(isMuted).then(console.log(`{Mute+} ADD ${target.user.tag} ${target.user.id} out of database!`));
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
                                console.log(`unmute logs error ${err}`);      
                            };
                        };
                        logsData({embeds: [unmutefinish]});
                    };
                });
            });
        });
    }
};
