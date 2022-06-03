var Twitter = require('twitter');
const Twit = require('twit');
const config = require('dotenv').config();
const needle = require('needle');
const { MessageEmbed, WebhookClient } = require('discord.js');

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

        } catch (error) { }
    })

    return stream
}

(async () => {
    let currentRules;

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