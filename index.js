require("dotenv").config()
const Discord = require("discord.js")
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
    message.channel.send("Shutting down...").then(() => { client.destroy() })
  }
  if (message.content.startsWith(`${prefix}github`)) {
    message.channel.send("https://github.com/treetreet0rrm0uth/MusicMonke")
  }
  if (message.content.startsWith(`${prefix}invite`)) {
    message.channel.send("https://discord.com/api/oauth2/authorize?client_id=827602845984751647&permissions=36703232&scope=bot")
  }
  if (message.content.startsWith(`${prefix}play`)) {
    execute(message, serverQueue)
    return
  }
  if (message.content.startsWith(`${prefix}skip`)) {
    skip(message, serverQueue)
    return
  }
  if (message.content.startsWith(`${prefix}stop`)) {
    stop(message, serverQueue)
    return
  }
  if (message.content.startsWith(`${prefix}ping`)) {
    message.channel.send(`Latency: ${message.createdTimestamp - Date.now()}ms\nAPI Latency: ${Math.round(client.ws.ping)}ms`)
  }
})

async function execute(message, serverQueue) {
  const args = message.content.split(" ")
  const voiceChannel = message.member.voice.channel
  const permissions = voiceChannel.permissionsFor(message.client.user)
  let song
  if (args[1] === undefined || args[1] == null || args[1] <= 0) {
    return message.channel.send("Invalid song title")
  } else if (ytdl.validateURL(args[1])) {
    const songInfo = await ytdl.getInfo(args[1])
    song = {
      title: songInfo.videoDetails.title,
      url: songInfo.videoDetails.video_url
    }
  } else {
    const { videos } = await yts(args.slice(1).join(" "))
    if (!videos.length) return message.channel.send("No songs were found")
    song = {
      title: videos[0].title,
      url: videos[0].url
    }
  }
  if (!voiceChannel)
    return message.channel.send("Join a voice channel to run this command")
  if (!permissions.has("CONNECT") || !permissions.has("SPEAK")) {
    return message.channel.send("Insufficient permissions")
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
    } catch (err) {
      console.log(err)
      queue.delete(message.guild.id)
      return message.channel.send(err)
    }
  } else {
    serverQueue.songs.push(song)
    return message.channel.send(`**${song.title}** has been added to the queue!`)
  }
}

function play(guild, song, serverQueue) {
  let dispatcher = queue.get(guild.id).connection
    .play(ytdl(song.url))
    .on("finish", () => {
      serverQueue.songs.shift()
      play(guild, queue.get(guild.id).songs[0])
    }).on("error", error => console.error(error))
  dispatcher.setVolumeLogarithmic(queue.get(guild.id).volume / 5)
  queue.get(guild.id).textChannel.send(`Started playing: **${song.title}**`)
}

function skip(message, serverQueue) {
  const guild = message.guild.id
  if (!message.member.voice.channel)
    return message.channel.send("Join a voice channel to run this command")
  if (!serverQueue)
    return message.channel.send("No song available to skip")
  else {
    play(guild, serverQueue.songs[1])
    serverQueue.songs.shift()
  }
}

function stop(message, serverQueue) {
  if (!message.member.voice.channel)
    return message.channel.send("Join a voice channel to run this command")
  if (!serverQueue)
    return message.channel.send("No song available to stop")
  serverQueue.songs = []
  serverQueue.voiceChannel.leave()
}

client.login(process.env.token)