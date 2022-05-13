const wppconnect = require("@wppconnect-team/wppconnect")
const db = require("./helper/mysql")
const winston = require('winston');

wppconnect.defaultLogger.clear();

const files = new winston.transports.File({ filename: 'teste.log' });
wppconnect.defaultLogger.add(files);

wppconnect
    .create({
        session: "sessionName", //Pass the name of the client you want to start the bot
        statusFind: (statusSession, session) => {
            console.log("Status Session: ", statusSession) //return isLogged || notLogged || browserClose || qrReadSuccess || qrReadFail || autocloseCalled || desconnectedMobile || deleteToken
            //Create session wss return "serverClose" case server for close
            console.log("Session name: ", session)
        },
        headless: false, // Headless chrome
        updatesLog: true,
        puppeteerOptions: {
            userDataDir: './tokens/sessionName',
        },
    })
    .then((client) => start(client))
    .catch((error) => console.log(error))

function start(client) {
    console.log("Iniciando...")
    client.startPhoneWatchdog(30000)

    client.onMessage(async (msg) => {
        try {
            const user = msg.from.replace(/\n/g, "")
            const getUser = await db.getUser(user)
            if (getUser == false) {
                setUserFrom = await db.setUser(user)
            }

            const question = msg.body
            const answer = await db.readQuestion(question)

            console.log("Pergunta: " + question)

            if (answer !== false) {
                console.log("Resposta: " + answer)
                client.sendText(msg.from, answer)
            }

            if (answer === false && msg.body.startsWith("!btn ")) {
                const botao = msg.body.split(" ")[1]
                const button = await db.lerBotao(botao)
                const title = button[0]
                const footer = button[1]
                const body = button[2]
                const btn1 = button[3]
                const btn2 = button[4]

                await client.sendMessageOptions(msg.from, body, {
                    title: title,
                    footer: footer,
                    isDynamicReplyButtonsMsg: true,
                    dynamicReplyButton: [
                        {
                            buttonId: "id1",
                            buttonText: {
                                displayText: btn1,
                            },
                            type: 1,
                        },
                        {
                            buttonId: "id2",
                            buttonText: {
                                displayText: btn2,
                            },
                            type: 1,
                        },
                    ],
                })
            }

            if (msg.body == "!chats") {
                const chats = await client.getAllChats()
                client.sendText(msg.from, `The bot has ${chats.length} chats open.`)
            }

            if (msg.body == "!info") {
                let info = await client.getHostDevice()
                let message = `_*Connection info*_\n\n`
                message += `*User name:* ${info.pushname}\n`
                message += `*Number:* ${info.wid.user}\n`
                message += `*Battery:* ${info.battery}\n`
                message += `*Plugged:* ${info.plugged}\n`
                message += `*Device Manufacturer:* ${info.phone.device_manufacturer}\n`
                message += `*WhatsApp version:* ${info.phone.wa_version}\n`
                client.sendText(msg.from, message)
            }

            if (msg.body.startsWith("!ChatState ")) {
                const option = msg.body.split(" ")[1]
                if (option == "1") {
                    await client.setChatState(msg.from, "0")
                } else if (option == "2") {
                    await client.setChatState(msg.from, "1")
                } else {
                    await client.setChatState(msg.from, "2")
                }
            }

            if (answer === false) {
                client.sendText(msg.from, "Não entendi a sua pergunta.")
            }
        } catch (error) {
            console.log(error)
        }
    })
}
