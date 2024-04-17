const Discord = require('discord.js');
const config = require('./config.json');

const shards = new Discord.ShardingManager('./index.js', {
    token: config.product_token,
    totalShards: "auto",
});

shards.on("shardCreate", shard => {
    console.log(`[${new Date().toString().split(" ", 5).join(" ")}] Shard Create #${shard.id}`);
    shard.on("death", (a) => {
        console.log(`[${new Date().toString().split(" ", 5).join(" ")}] Shard death #${shard.id} | ${JSON.stringify(a)}`);
    });
    shard.on("disconnect", () => {
        console.log(`[${new Date().toString().split(" ", 5).join(" ")}] Shard disconnect #${shard.id}`);
    });
    shard.on("error", (err) => {
        console.log(`[${new Date().toString().split(" ", 5).join(" ")}] Shard error #${shard.id} | ${err}`);
    });
    shard.on("ready", () => {
        console.log(`[${new Date().toString().split(" ", 5).join(" ")}] Shard Ready #${shard.id} !`);
    });
    shard.on("reconnecting", () => {
        console.log(`[${new Date().toString().split(" ", 5).join(" ")}] Shard reconnecting #${shard.id} !`);
    })
});


shards.spawn({timeout: -1, amount: shards.totalShards, delay: 12500}); 
