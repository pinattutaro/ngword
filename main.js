const fs = require('fs');
const path = require('path');
const express = require('express');
const app = express();

const http = require('http');
const WebSocket = require('ws');
const wss = new WebSocket.Server({ noServer: true });
const server = http.createServer(app);

// const host = "10.133.6.199";
const host = "localhost";

const port = 1200;

const teams = JSON.parse(fs.readFileSync("./teams.json","utf-8"));
const absent = ["3-22"];

function derangement(arr) {
    let n = arr.length;
    let result = arr.slice();
    do {
        for (let i = n - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [result[i], result[j]] = [result[j], result[i]];
        }
    } while (result.some((v, i) => v === arr[i]) && n > 1);
    return result;
}

class Group {
    constructor(mem) {
        this.member = mem;
        this.datas = mem.reduce((obj, key) => {
            obj[key] = {con: undefined, name: "", word: "", ngword: ""};
            return obj;
        },{});
    }

    login(ws, arg) {
        const data = this.datas[arg.id];
        console.log(arg);
        data.con = ws;
        data.name = arg.name;
        data.word = arg.word;

        if (this.member.every(e => this.datas[e].con)) this.start();
    }

    start() {
        console.log("stt");
        const words = this.member.map(m => this.datas[m].word);
        const shuffled = derangement(words);
        this.member.forEach((m,i) => {
            this.datas[m].ngword = shuffled[i];
        });
        // console.log(this.datas);
        this.send(JSON.stringify({type: "start", detail: this.datas}));

        this.member.forEach((m) => {
            this.datas[m].con.on("message", (msg) => {
                const data = JSON.parse(msg);
                const type = data.type;
                switch(type) {
                    case "cardClick": 
                        console.log(data.id);
                        this.send(JSON.stringify({type: "out", id: data.id}));
                        break;
                    case "reset":
                        this.send(JSON.stringify({type: "reset"}));
                        this.member.forEach((m) => {
                            this.datas[m] = {con: undefined, name: "", word: "", ngword: ""};
                        });
                        break;
                    default: console.log(type);
                }
            })
        });
    }

    send(msg) {
        this.member.forEach((m) => {
            this.datas[m].con.send(msg);
        })
    }
}

const groups = {};
teams.forEach((t) => {
    const g = new Group(t.filter(e => !absent.includes(e)));
    t.forEach((m) => {
        if(absent.includes(m)) return;
        groups[m] = g;
    });
});
console.log(groups);

wss.on("connection", (ws) => {
    console.log("conected");
    const user = {
        id: 0,
        name: "",
        word: ""
    };

    ws.on("message", (msg) => {
        console.log(msg);

        const data = JSON.parse(msg);
        const type = data.type; 

        switch(type) {
            case "login": 
                const grp = groups[data.id];
                if (grp === undefined) {ws.send(JSON.stringify({type: "loginBack", result: "wrong"})); break;}
                ws.send(JSON.stringify({type: "loginBack", result: "ok", id: data.id}));               
                grp.login(ws,data); break; 
            default: console.log(type);
        }
    });
});

server.on('upgrade', (request, socket, head) => {
    wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
    });
});

app.get("/", (req, res) => {
    console.log('someone access');
    res.sendFile(__dirname + "/index.html");
});

server.listen(port, host , () => {
    console.log(`Server is running on http://${host}:${port}`);
});