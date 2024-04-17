const Discord = require('discord.js');
const moment = require('moment');

module.exports = {
    data: new Discord.SlashCommandBuilder()
    .setName('roleinfo')
    .setDescription('Giving a role information')
    .addRoleOption(o => o.setName('role').setDescription('mention a role or specify role id').setRequired(true)),
    async execute(interaction) {
        if(!interaction.guild.members.me.permissions.has(Discord.PermissionFlagsBits.EmbedLinks)) {
            interaction.editReply({content: '❌ Sorry, I Don\'t have Permission! `Embed Links`', ephemeral: true}).catch(err => {console.error(err)})
            return;
        };
        let roletarget = interaction.options.getRole('role');
        if(!interaction.guild.roles.cache.get(roletarget.id)) {
            interaction.editReply({content: '⚠️ Can\'t find that specify role in this server !', ephemeral: true});
            return;  
        };
        const roleinfoembed = new Discord.EmbedBuilder()
        .setAuthor({name: `Role: ${roletarget.name}`, iconURL: 'https://images.emojiterra.com/google/android-nougat/512px/2139.png'})
        .setDescription(roletarget.toString())
        .setColor(0x00FFFF)
        .addFields(
            {name: 'Name:', value: `\`${roletarget.name}\``, inline: true},
            {name: 'ID:', value: `\`${roletarget.id}\``, inline: true},
            {name: 'Color:', value: `\`${roletarget.hexColor}\``, inline: true},
            {name: 'Created At:', value: `\`${moment.utc(roletarget.createdAt).format('MMMM Do YYYY, HH:mm:ss')}\``, inline: true},
            {name: 'Position:', value: `\`${roletarget.position}/${interaction.guild.roles.cache.size - 1}\`\n\`bottom to top\``},
            {name: 'Mentions:', value: `\`${roletarget.toString()}\``, inline: true},
            {name: 'Mentionable:', value: `\`${roletarget.mentionable}\``, inline: true}
        )
        .setFooter({text: interaction.user.tag + ' | REQUESTED', iconURL: interaction.user.avatarURL({size: 1024})})
       interaction.editReply({embeds: [roleinfoembed]}).catch(err => console.log('roleinfo error :' + err))
    }
};