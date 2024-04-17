const Discord = require('discord.js');
const jailuserlist = require('../models/jailuserlist-profile-schema');
const muteuserlist = require('../models/muteuserlist-profile-schema');
const ms = require('ms');

module.exports = {
    data: new Discord.SlashCommandBuilder()
    .setName("check")
    .setDescription("Check User Jail/Mute Status")
    .addUserOption(o => o.setName('user').setDescription('mention user or specify user id').setRequired(true)),
    async execute(interaction) {
        if(!interaction.guild.members.me.permissions.has(Discord.PermissionFlagsBits.EmbedLinks)) {
            interaction.editReply({content: '❌ Sorry, I Don\'t have Permission! `Embed Links`', ephemeral: true}).catch(err => {console.error(err)})
            return;
        };
        let target = interaction.options.getUser('user');
        if(!interaction.guild.members.cache.get(target.id)) {
            interaction.editReply('⚠️ You can\'t check that user! `Can\'t find in this server`').catch(err => {console.error(err)});
            return;
        };
        if(target) jailuserlistdata = jailuserlist.findOne({UserID : target.id, GuildID: interaction.guild.id});
        if(target) muteuserlistdata = muteuserlist.findOne({UserID : target.id, GuildID: interaction.guild.id});
        jailuserlistdata.then(async isJailed => {
            muteuserlistdata.then(async isMuted => {
                let checkJail;
                let checkMute;
                let jailTimels0;
                let muteTimels0;
                if(isJailed && isJailed.jailTime && Math.floor(isJailed.jailTime - Date.now()) > 0) jailTimels0 = ms(Math.floor(isJailed.jailTime - Date.now()), {long: true});
                if(isJailed && isJailed.jailTime && Math.floor(isJailed.jailTime - Date.now()) < 0) jailTimels0 = `Please wait...`;
                if(isMuted && isMuted.muteTime && Math.floor(isMuted.muteTime - Date.now()) > 0) muteTimels0 = ms(Math.floor(isMuted.muteTime - Date.now()), {long: true});
                if(isMuted && isMuted.muteTime && Math.floor(isMuted.muteTime - Date.now()) < 0) muteTimels0 = `Please wait...`;
                if(isJailed && !isJailed.jailTime) checkJail = ":lock: Jail Status : Imprisonment!"
                if(isJailed && isJailed.jailTime) checkJail = `:lock: Jail Status : Imprisonment! Time Remaining: \`${jailTimels0}\``;
                if(isMuted && !isMuted.muteTime) checkMute = ":speaker: Mute Status : Muted!";
                if(isMuted && isMuted.muteTime) checkMute = `:speaker: Mute Status : Muted! Time Remaining: \`${muteTimels0}\``
                if(!isJailed) checkJail = ":unlock: Jail Status : Normal Member!" 
                if(!isMuted) checkMute = ":loud_sound: Mute Status : Normal Member!"
                const checkembed = new Discord.EmbedBuilder()
                .setAuthor({name: `Status: ${target.tag}`, iconURL: target.avatarURL({size: 1024})})
                .setFooter({text: interaction.user.tag + ' | REQUESTED', iconURL: interaction.user.avatarURL({size: 1024})})
                .setDescription(`${checkJail}\n${checkMute}`)
                .setColor(0x00FFFF)
                .setTimestamp()
               await interaction.editReply({embeds: [checkembed]}).catch(err => {console.error(err)})
            });
        });
    }
};