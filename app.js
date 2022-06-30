var log = require('loglevel');
var needle = require('needle');
var { MessageEmbed, WebhookClient } = require('discord.js');
const prefix = require('loglevel-plugin-prefix');
const chalk = require('chalk');

// Twitter credentials
const token = process.env.bearertoken;
// Discord credentials
const webhookId = process.env.webhookid;
const webhookToken = process.env.webhooktoken;

const rulesURL = 'https://api.twitter.com/2/tweets/search/stream/rules';
const streamURL = 'https://api.twitter.com/2/tweets/search/stream?user.fields=description,created_at,profile_image_url&tweet.fields=entities&expansions=author_id';

// Creating and setting a webhookClient
const webhookClient = new WebhookClient({ id: webhookId, token: webhookToken });

// Beginning of Twitter API stream stuff
const rules = [{ value: "from:Coach_Kenshin" }];

//loglevel-prefix and chalk setup
prefix.reg(log);
log.enableAll();

const colors = {
    TRACE: chalk.magenta,
    DEBUG: chalk.cyan,
    INFO: chalk.blue,
    WARN: chalk.yellow,
    ERROR: chalk.red,
};

prefix.reg(log);
log.enableAll();

prefix.apply(log, {
    format(level, name, timestamp) {
        return `${chalk.gray(`[${timestamp}]`)} ${colors[level.toUpperCase()](level)} ${chalk.green(`${name}:`)}`;
    },
});

prefix.apply(log.getLogger('critical'), {
    format(level, name, timestamp) {
        return chalk.red.bold(`[${timestamp}] ${level} ${name}:`);
    },
});

// Get stream rules 
async function getRules() {
    const response = await needle('get', rulesURL, {
        headers: {
            Authorization: `Bearer ${token}`
        }
    })

    return response.body;
}

// Set stream rules 
async function setRules() {
    const data = {
        add: rules
    }

    const response = await needle('post', rulesURL, data, {
        headers: {
            'content-type': 'application/json',
            Authorization: `Bearer ${token}`
        }
    })

    return response.body;
}

// Delete stream rules 
async function deleteRules(rules) {
    if (!Array.isArray(rules.data)) {
        return null;
    }
    const ids = rules.data.map((rule) => rule.id);

    const data = {
        delete: {
            ids: ids
        }
    }

    const response = await needle('post', rulesURL, data, {
        headers: {
            'content-type': 'application/json',
            Authorization: `Bearer ${token}`
        }
    })

    return response.body;
}

function streamTweets() {
    const stream = needle.get(streamURL, {
        headers: {
            Authorization: `Bearer ${token}`,
        },
    })

    stream.on('data', (data) => {
        try {
            const json = JSON.parse(data)

            var testUrl = "https://twitter.com/" + json.includes.users[0].name + "/status/" + json.data.id;
            var testText = json.data.text;
            var testName = json.includes.users[0].name;
            var testUsername = json.includes.users[0].username;

            var profile = json.includes.users[0].profile_image_url;

            // Now to send a message to discord via webhook 
            const embed = new MessageEmbed()
                .setTitle(testUrl)
                .setAuthor({ name: `${testName}(@${testUsername})`, iconURL: profile, url: testUrl })
                .setColor('#0099ff')
                .setDescription(testText)
                .setTimestamp();
            webhookClient.send({
                content: 'Kenshin just tweeted! <@&982292968511787088>',
                username: 'Kenshin Tweets',
                avatarURL: profile,
                embeds: [embed],
            });

        } catch (error) {
            log.error(error.stack);
            log.error(error.name);
            log.error(error.message);
        }
    });

    return stream
}

(async () => {
    let currentRules;
    log.info('Starting script');
    console.log('starting...');
    try {
        //   Get all stream rules
        currentRules = await getRules();

        //   Delete all stream rules
        await deleteRules(currentRules);

        //   Set rules based on array above
        await setRules();

    } catch (error) {
        console.error(error);
        process.exit(1);
    }

    streamTweets();
})()
