const Discord = require('discord.js')

module.exports = {
  data: new Discord.SlashCommandBuilder()
  .setName("avatar")
  .setDescription("Giving user avatar link")
  .addUserOption(o => o.setName('user').setDescription('mention user')),
  async execute(interaction) {
    if(!interaction.guild.members.me.permissions.has(Discord.PermissionFlagsBits.EmbedLinks)) {
      interaction.editReply({content: '❌ Sorry, I Don\'t have Permission! `Embed Links`', ephemeral: true}).catch(err => {console.error(err)})
      return;
    };
    let acmd = interaction.options.getUser('user') || interaction.user;
    if(!acmd.avatar) {
        const embed = new Discord.EmbedBuilder()
         .setDescription('❌ ' + acmd.toString() + ' hasn\'t avatar!')
         .setColor(0xFF0000)
        interaction.editReply({embeds:[embed]}).catch(err => {console.error(err)});
        return;
    };
    const avatarembed = new Discord.EmbedBuilder()
     .setAuthor({name: acmd.tag, iconURL: acmd.avatarURL({size: 2048})})
     .setDescription(`[Click Here](${acmd.avatarURL({size: 2048})}) To Get Avatar Link`)
     .setImage(acmd.avatarURL({size: 2048}))
     .setColor(0x00FFFF)
     .setFooter({text: interaction.user.tag + ' | REQUESTED', iconURL: interaction.user.avatarURL({size: 1024})})

    interaction.editReply({embeds:[avatarembed]}).catch(err => {console.error(err)});
  }  
};