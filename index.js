require("dotenv").config()
const Discord = require("discord.js")
const { MessageEmbed } = require("discord.js")
const prefix = process.env.prefix
const ytdl = require("ytdl-core")
const yts = require("yt-search")
const client = new Discord.Client({
  presence: {
    status: "online",
    activity: {
      name: ".play",
      type: "PLAYING"
    }
  }
})
const queue = new Map()

client.once("ready", () => {
  console.log("Started")
})

client.on("message", async message => {
  const serverQueue = queue.get(message.guild.id)
  if (message.author.bot) return
  if (!message.content.startsWith(prefix)) return
  if (message.author.bot || !message.content.startsWith(prefix)) {
    return
  }
  if (message.author.id == 694669671466663957 && message.content.startsWith(`${prefix}kill`)) {
    message.react("✅")
    message.channel.send("Shutting down...").then(() => { client.destroy() })
  }
  if (message.content.startsWith(`${prefix}github`)) {
    message.react("✅")
    message.channel.send("https://github.com/treetreet0rrm0uth/MusicMonke")
  }
  if (message.content.startsWith(`${prefix}invite`)) {
    message.react("✅")
    message.channel.send("https://discord.com/api/oauth2/authorize?client_id=827602845984751647&permissions=36703232&scope=bot")
  }
  if (message.content.startsWith(`${prefix}ping`)) {
    message.react("✅")
    message.channel.send(`Latency: ${Math.abs(Date.now() - message.createdTimestamp)}ms\nAPI Latency: ${Math.round(client.ws.ping)}ms`)
  }
  if (message.content.startsWith(`${prefix}help`)) {
    const helpEmbed = new MessageEmbed()
      .setColor("#FFFFFF")
      .setTitle("Help")
      .addFields(
        { name: ".play {Song Name/URL}", value: "Play a song from the song title or YouTube URL", inline: false },
        { name: ".skip", value: "Skips the current song for the next song in queue", inline: false },
        { name: ".stop", value: "Stops the current song/queue from playing", inline: false },
        { name: ".queue", value: "View the current queue", inline: false },
        { name: ".ping", value: "View bot and Discord API ping", inline: false },
        { name: ".github", value: "View this bot's GitHub repository", inline: false },
        { name: ".invite", value: "Create an invite for this bot", inline: false }
      )
      .setFooter("tree tree t0rr m0uth", "https://i.imgur.com/1iV8FlJ.png")
      .setTimestamp()
    message.react("✅")
    message.channel.send(helpEmbed)
  }
  if (message.content.startsWith(`${prefix}play `) || message.content.startsWith(`${prefix}p `)) {
    execute(message, serverQueue)
    return
  }
  if (message.content.startsWith(`${prefix}skip`)) {
    skip(message, serverQueue)
    return
  }
  if (message.content.startsWith(`${prefix}stop`) || message.content.startsWith(`${prefix}s`)) {
    stop(message, serverQueue)
    return
  }
  if (message.content.startsWith(`${prefix}queue`) || message.content.startsWith(`${prefix}q`)) {
    songQueue(message, serverQueue)
    return
  }
})

async function execute(message, serverQueue) {
  const args = message.content.split(" ")
  const voiceChannel = message.member.voice.channel
  if (!voiceChannel) {
    message.react("❌")
    return message.channel.send("Join a voice channel to run this command!")
  }
  const permissions = voiceChannel.permissionsFor(message.client.user)
  if (!permissions.has("CONNECT") || !permissions.has("SPEAK")) {
    message.react("❌")
    return message.channel.send("Insufficient permissions!")
  }
  let song
  if (args[1] === undefined || args[1] == null || args[1] <= 0) {
    message.react("❌")
    return message.channel.send("Invalid song title!")
  } else if (ytdl.validateURL(args[1])) {
    const songInfo = await ytdl.getInfo(args[1])
    song = {
      title: songInfo.videoDetails.title,
      url: songInfo.videoDetails.video_url
    }
  } else {
    const { videos } = await yts(args.slice(1).join(" "))
    if (!videos.length) {
      message.react("❌")
      return message.channel.send("No songs were found.")
    }
    song = {
      title: videos[0].title,
      url: videos[0].url
    }
  }
  if (!serverQueue) {
    const queueContruct = {
      textChannel: message.channel,
      voiceChannel: voiceChannel,
      connection: null,
      songs: [],
      volume: 5,
      playing: true
    }
    queue.set(message.guild.id, queueContruct)
    queueContruct.songs.push(song)
    try {
      var connection = await voiceChannel.join()
      connection.voice.setSelfDeaf(true)
      queueContruct.connection = connection
      play(message.guild, queueContruct.songs[0])
      message.react("✅")
    } catch (err) {
      console.log(err)
      queue.delete(message.guild.id)
      return message.channel.send(err)
    }
  } else {
    serverQueue.songs.push(song)
    message.react("✅")
    return message.channel.send(`**${song.title}** has been added to the queue!`)
  }
}

function play(guild, song, message) {
  const serverQueue = queue.get(guild.id)
  if (!song) {
    serverQueue.voiceChannel.leave()
    queue.delete(guild.id)
    return
  }
  const dispatcher = serverQueue.connection
    .play(ytdl(song.url))
    .on("finish", () => {
      serverQueue.songs.shift();
      play(guild, serverQueue.songs[0]);
    }).on("error", error => console.error(error))
  dispatcher.setVolumeLogarithmic(queue.get(guild.id).volume / 5)
  serverQueue.textChannel.send(`Started playing: **${song.title}**`)
}

function skip(message, serverQueue) {
  if (!message.member.voice.channel) {
    message.react("❌")
    return message.channel.send("Join a voice channel to run this command!")
  }
  if (!serverQueue) {
    message.react("❌")
    return message.channel.send("No song available to skip!")
  }
  serverQueue.connection.dispatcher.end()
}

function stop(message, serverQueue) {
  if (!message.member.voice.channel) {
    message.react("❌")
    return message.channel.send("Join a voice channel to run this command!")
  }
  if (!serverQueue) {
    message.react("❌")
    return message.channel.send("No song available to stop!")
  }
  serverQueue.songs = []
  serverQueue.connection.dispatcher.end()
}

function songQueue(message, serverQueue) {
  if (!serverQueue) {
    message.react("❌")
    return message.channel.send("Queue is empty!")
  }
  const queueEmbed = new MessageEmbed()
    .setColor("#FFFFFF")
    .setTitle("Song Queue")
    .setFooter("tree tree t0rr m0uth", "https://i.imgur.com/1iV8FlJ.png")
    .setTimestamp()
  for (let i = 0; i < serverQueue.songs.length; i++) {
    queueEmbed.addFields(
      { name: `Song ${i + 1}`, value: serverQueue.songs[i].title, inline: false }
    )
  }
  message.react("✅")
  message.channel.send(queueEmbed)
}

client.login(process.env.token)