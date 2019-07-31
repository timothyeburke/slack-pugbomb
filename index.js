const AWS = require('aws-sdk')
const kms = new AWS.KMS()
const https = require('https')
const randomize = array => array.sort(() => .5 - Math.random()).sort(() => .5 - Math.random())
const api_key = async () => await kms.decrypt({ CiphertextBlob: new Buffer(process.env.api_key, 'base64') })
                                     .promise()
                                     .then(data => data.Plaintext.toString('ascii'))
const get = async url => await new Promise((resolve, reject) => {
    let body = ''
    https.get(url, res => {
        res.on('data', chunk => body = `${body}${chunk}`)
        res.on('end', () => resolve(JSON.parse(body)))
        res.on('error', reject)
    })
})

exports.handler = async event => {
    const regex = new RegExp(/command=\/(\w+)/g)
    const result = regex.exec(decodeURIComponent(event.body))
    const command = result ? result[1] : 'dogbomb'
    const queries = {
        dogbomb:    { search: 'happy+dog', pages: 25, text: 'You requested dogs.' },
        pugbomb:    { search: 'pug',       pages: 10, text: 'THERE ARE PUGS.' },
        corgibomb:  { search: 'corgi',     pages: 2,  text: 'The queen approves of your request for corgis.' },
        kittenbomb: { search: 'kitten',    pages: 25, text: 'Soft kitty, warm kitty, little ball of fur! Happy kitty, sleepy kitty, purr purr purr!' },
        dogebomb:   { search: 'shiba+inu', pages: 2,  text: 'Such doge. Very good boy. Wow.' }
    }
    const query = queries[command] || queries.dogbomb
    const page = Math.floor(Math.random() * query.pages) + 1
    return api_key().then(key => `https://pixabay.com/api/?key=${key}&q=${query.search}&safesearch=true&page=${page}`)
                    .then(get)
                    .then(data => data.hits)
                    .then(randomize)
                    .then(data => data.slice(0, 4))
                    .then(data => ({
            statusCode: 200,
            body: JSON.stringify({
                parse: "full",
                response_type: "in_channel",
                text: query.text,
                attachments: data.map(datum => ({ image_url: datum.largeImageURL })),
                unfurl_media: true,
                unfurl_links: true
            })
        })
    )
}

