const Discord = require('discord.js');
const phFunction = require('../function/main.js');
const bccooldowncommand = new Map();

module.exports = {
    data: new Discord.SlashCommandBuilder()
    .setName('announcement')
    .setDescription('Send a message into every prison cells.')
    .addStringOption(o => o.setName('message').setDescription('specify a message').setRequired(true)),
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
        if(bccooldowncommand.has(interaction.user.id)) {
            const embed = new Discord.EmbedBuilder()
             .setDescription('💬 You need to wait 120 seconds before execute this command again!')
             .setColor(0x00FFFF)
            interaction.editReply({embeds: [embed], ephemeral: true}).catch(err => {console.error(err)});
            return;
        };
        if(interaction.options.getString('message').length > 1024) {
            const embed = new Discord.EmbedBuilder()
             .setDescription('💬 Your messages must be between 1 and 1024 character length')
             .setColor(0x00FFFF)
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
            if(!interaction.options.getString('message')) {
                const embed = new Discord.EmbedBuilder()
                .setDescription('💬 You need to specify a message after command!')
                .setColor(0x00FFFF)
                interaction.editReply({embeds: [embed], ephemeral: true}).catch(err => {console.error(err)});
               return;
            };
            const promisexd = [];
            for(const channel of interaction.guild.channels.cache.values()) {
                if(channel.parent && channel.parent.id === getCategoryID && channel.type === Discord.ChannelType.GuildText && !channel.name.toLowerCase().includes('logs') && channel.permissionsFor(interaction.guild.members.me.user.id).has(Discord.PermissionFlagsBits.ViewChannel && Discord.PermissionFlagsBits.SendMessages)) {
                    try {
                        const embed = new Discord.EmbedBuilder()
                         .setAuthor({name: `Police Announcement`, iconURL: interaction.guild.iconURL({dynamic:true, size: 2048})})
                         .setDescription(`${interaction.options.getString('message')}`)
                         .setFooter({text: `${interaction.user.tag} | REQUESTED!`, iconURL: interaction.user.avatarURL({dynamic: true, size: 2048})})
                         .setColor(0x00FFFF)
                        promisexd.push(channel.send({embeds: [embed]}));
                    } catch(err) {
                        console.log(`announcement in promise error ${err}`);
                    };
                };
            };
            Promise.all(promisexd).catch(err => {console.log(`Error while promise all ${err} at promisexd of announcement`)});
            try {
                const embed = new Discord.EmbedBuilder()
                .setAuthor({name: 'Announcement'})
                .setDescription(`:white_check_mark: Successful!`)
                .setFooter({text: `${interaction.user.tag} | REQUESTED!`, iconURL: interaction.user.avatarURL({size: 2048})})
                .setColor(0x00FF00)
                interaction.editReply({embeds: [embed]}).catch(err => {console.error(err)});
                console.log(`(-->) announcement finished at ${interaction.guild.name}(${interaction.guild.id})`)
            } catch(err) {
        
                console.log(`Error while sending embed ${err} at announcement`);
                interaction.editReply({content: `Found error ${err} Please contact developer!`, ephemeral: true}).catch(err => {console.error(err)});
        
            };
            try {
        
                const embed = new Discord.EmbedBuilder()
                 .setAuthor({name: `${interaction.user.tag} Announcement`, iconURL: interaction.user.avatarURL({size: 2048})})
                 .setDescription(`${interaction.options.getString('message')}`)
                 .setColor(0x00FFFF)
                 .setTimestamp(Date.now())
        
                interaction.guild.channels.cache.forEach(channel => {
                    if(channel.parent && channel.parent.id === getCategoryID && channel.name.toLowerCase().includes('logs')) {
                        if(channel.permissionsFor(interaction.guild.members.me).has(Discord.PermissionFlagsBits.SendMessages && Discord.PermissionFlagsBits.ViewChannel)) {
                            channel.send({embeds: [embed]});
                        };
                    };
                });
        
            } catch(err) {
        
                console.log(`Error while sending logs announcement === ${err}`);
        
            };
        
            bccooldowncommand.set(interaction.user.id);
            console.log(`[BCCOOLDOWN] ADD ${interaction.user.tag}(${interaction.user.id})`);
            setTimeout(() => {
                bccooldowncommand.delete(interaction.user.id);
                console.log(`[BCCOOLDOWN] REMOVED ${interaction.user.tag}`);
            },120000);
        });
    }
};