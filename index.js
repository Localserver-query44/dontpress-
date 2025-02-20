const express = require('express');
const axios = require('axios');
const cors = require('cors'); 
const fs = require("fs");
const path = require("path");
const cache = require('memory-cache'); 
const app = express();
const port = 3000;

const API_TOKEN = '30f4cd4e587c1bedc39690b2fe2b518a9da63b40';
const BASE_URL = 'https://free-ff-api-src-5plp.onrender.com/api/v1';
const ICON_BASE_URL = 'https://www.library.freefireinfo.site/icons/';
const CACHE_DURATION = 24 * 60 * 60 * 1000; 
const domain = 'https://free.sanzdev.web.id';  
const apikey = 'ptlc_j31v8GgFLL3AW1NeEA22VbadZjxs5M5lzidiEJ4jo9v';  
const page = 1;  
const passwordAkses = 'botkey'; 

const supportedRegions = ['IND', 'BR', 'SG', 'RU', 'ID', 'TW', 'US', 'VN', 'TH', 'ME', 'PK', 'CIS', 'BD'];

app.use(cors({
    origin: '*', 
    methods: ['GET', 'POST'], 
    allowedHeaders: ['Content-Type', 'Authorization'] 
}));


const fetchFromApi = async (url, res, cacheKey) => {
    try {
        let cachedData = cache.get(cacheKey);
        if (cachedData) {
            console.log("Returning cached data for: ", cacheKey);
            return res.send(cachedData);
        }

        const response = await axios.get(url);
        if (!response.data || Object.keys(response.data).length === 0) {
            return res.status(429).json({
                error: 'API limit has been reached. The limit will reset in 1-2 hours.'
            });
        }

        const responseData = JSON.stringify(response.data, null, 2);
        cache.put(cacheKey, responseData, CACHE_DURATION);

        res.setHeader('Content-Type', 'application/json');
        res.send(responseData);
    } catch (error) {
        res.status(error.response ? error.response.status : 500).json({
            error: 'Failed to fetch data',
            details: error.message
        });
    }
};

const isValidRegion = (region) => supportedRegions.includes(region.toUpperCase());

app.use((req, res, next) => {
    if (req.path === '/index.js') {
        res.status(403).send('Forbidden');
    } else {
        next();
    }
});

app.use(express.static("public"));
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
});



app.get('/safelink', async (req, res) => {
    const { url, alias, passcode } = req.query;

    if (!url) {
        return res.status(400).json({
            creator: 'Sanzdev',
            status: 'false',
            error: 'URL is required'
        });
    }

    try {
        const response = await axios.post(
            'https://safelinku.com/api/v1/links',
            {
                url,      
                alias,    
                passcode,  
            },
            {
                headers: {
                    'Authorization': `Bearer ${API_TOKEN}`,
                    'Content-Type': 'application/json',
                },
            }
        );

        if (response.status === 201) {
            res.status(201).json({
                creator: 'Sanzdev',  
                status: 'true',
                shortenedUrl: response.data.url
            });
        } else {
            res.status(response.status).json({
                creator: 'Sanzdev',
                status: 'false',
                error: 'Failed to create link',
            });
        }
    } catch (error) {
        if (error.response) {
            res.status(error.response.status).json({
                creator: 'Sanzdev',
                status: 'false',
                error: error.response.data.message || 'An error occurred',
            });
        } else {
            res.status(500).json({
                creator: 'Sanzdev',
                status: 'false',
                error: 'Internal server error'
            });
        }
    }
});


app.get('/get', async (req, res) => {
    const { url } = req.query;

    if (!url) {
        return res.status(400).json({ error: 'Missing "url" parameter.' });
    }
    try {
        const response = await axios.get(url);
        res.setHeader('Content-Type', 'application/json');
        res.send(JSON.stringify(response.data, null, 2)); 
    } catch (error) {
        return res.status(500).json({ 
            error: 'Failed to fetch data from the URL', 
            details: error.message 
        });
    }
});

app.get('/panel/delusr', async (req, res) => {
    const { id, pass } = req.query;

    if (pass !== passwordAkses) {
        return res.status(403).json({ error: 'Access denied. Invalid password.' });
    }

    if (!id) {
        return res.status(400).json({ error: 'Missing "id" parameter.' });
    }

    try {
        let f = await fetch(`${domain}/api/application/users/${id}`, {
            method: "DELETE",
            headers: {
                "Accept": "application/json",
                "Content-Type": "application/json",
                "Authorization": `Bearer ${apikey}`
            }
        });

        let resData = f.ok ? {
            message: `User with ID ${id} has been successfully deleted.`,
            errors: null
        } : await f.json();

        if (!f.ok) {
            return res.status(500).json({ error: 'Failed to delete user', details: resData });
        }

        res.json(resData); 

    } catch (error) {
        return res.status(500).json({ error: 'Failed to connect to the API', details: error.message });
    }
});


app.get('/panel/addusr', async (req, res) => {
    const { usernm, passwd } = req.query;

    if (!usernm || !passwd) {
        return res.status(400).json({ error: 'Missing "usernm" or "passwd" parameter.' });
    }
    const last_name = usernm.slice(-3);

    try {
        const response = await axios.post(`${domain}/api/application/users`, {
            username: usernm,
            first_name: usernm, 
            last_name: last_name, 
            email: `${usernm}@sanzdev.com`, 
            password: passwd,
            root_admin: false, 
            language: 'en'
        }, {
            headers: {
                "Accept": "application/json",
                "Authorization": `Bearer ${apikey}`,
                "Content-Type": "application/json"
            }
        });
        if (response.status === 201) {
            const userData = response.data.attributes;
            return res.json({
                message: `User ${usernm} has been successfully created.`,
                user: {
                    id: userData.id,
                    username: userData.username,
                    email: userData.email,
                    first_name: userData.first_name,
                    last_name: userData.last_name,
                    language: userData.language
                }
            });
        } else {
            return res.status(500).json({ error: 'Failed to create user', details: response.data });
        }
    } catch (error) {
        return res.status(500).json({ error: 'Failed to connect to the API', details: error.message });
    }
});

app.get('/panel/delsrv', async (req, res) => {
    const { pass, id } = req.query;

    if (!pass || !id) {
        return res.status(400).json({ error: 'Missing "pass" or "id" parameter.' });
    }

    if (pass !== passwordAkses) {
        return res.status(403).json({ error: 'Invalid access password.' });
    }

    try {
        const response = await fetch(`${domain}/api/application/servers/${id}`, {
            method: "DELETE",
            headers: {
                "Accept": "application/json",
                "Content-Type": "application/json",
                "Authorization": `Bearer ${apikey}`
            }
        });

        if (response.ok) {
            return res.json({ message: `Server with ID ${id} has been successfully deleted.` });
        } else {
            const errorData = await response.json();
            return res.status(500).json({ error: 'Failed to delete server', details: errorData });
        }
    } catch (error) {
        return res.status(500).json({ error: 'Failed to connect to the API', details: error.message });
    }
});

const fetchUserDetails = async (userId) => {
    try {
        let response = await axios.get(`${domain}/api/application/users/${userId}`, {
            headers: {
                "Accept": "application/json",
                "Authorization": `Bearer ${apikey}`
            }
        });
        return response.data.attributes;
    } catch (error) {
        return { username: 'Unknown', email: 'Unknown' };
    }
};

const fetchAllServers = async () => {
    let allServers = [];
    let page = 1;
    let hasNextPage = true;

    try {
        while (hasNextPage) {
            let response = await axios.get(`${domain}/api/application/servers?page=${page}`, {
                headers: {
                    "Accept": "application/json",
                    "Authorization": `Bearer ${apikey}`
                }
            });

            let servers = response.data.data;
            
            for (const server of servers) {
                let s = server.attributes;
                let userDetails = await fetchUserDetails(s.user);
                
                allServers.push({
                    id: s.id,
                    name: s.name,
                    description: s.description,
                    user_id: s.user,
                    username: userDetails.username,
                    email: userDetails.email,
                    ram: s.limits.memory,    
                    disk: s.limits.disk           
                });
            }

            hasNextPage = response.data.meta.pagination.current_page < response.data.meta.pagination.total_pages;
            page++;
        }

        return allServers;

    } catch (error) {
        return { error: 'Failed to fetch servers' };
    }
};

app.get('/panel/listpanel', async (req, res) => {
    const allServers = await fetchAllServers();
    if (allServers.error) {
        return res.status(500).json(allServers);
    }
    res.setHeader('Content-Type', 'application/json');
    res.send(JSON.stringify(allServers, null, 2));
});

app.get('/api/v1/icon', async (req, res) => {
    const { id } = req.query;
    if (!id) {
        return res.status(400).json({ error: 'Please provide an "id" parameter.' });
    }
    const iconUrl = `${ICON_BASE_URL}${id}.png`;
    try {
        const response = await axios.get(iconUrl, { responseType: 'arraybuffer' });
        res.set('Content-Type', 'image/png');
        res.send(response.data);
    } catch (error) {
        res.status(404).json({ error: 'Not GET Icon' });
    }
});

app.get('/api/v1/account', (req, res) => {
    const { region, uid } = req.query;
    if (!region || !uid) {
        return res.status(400).json({ error: 'Please provide both "region" and "uid" parameters.' });
    }
    if (!isValidRegion(region)) {
        return res.status(400).json({ error: `Region ${region} is not supported. Supported regions are: ${supportedRegions.join(', ')}` });
    }
    const url = `${BASE_URL}/account?region=${region}&uid=${uid}`;
    const cacheKey = `account-${region}-${uid}`;
    fetchFromApi(url, res, cacheKey);
});

app.get('/api/v1/craftlandProfile', (req, res) => {
    const { region, uid } = req.query;
    if (!region || !uid) {
        return res.status(400).json({ error: 'Please provide both "region" and "uid" parameters.' });
    }
    if (!isValidRegion(region)) {
        return res.status(400).json({ error: `Region ${region} is not supported. Supported regions are: ${supportedRegions.join(', ')}` });
    }
    const url = `${BASE_URL}/craftlandProfile?region=${region}&uid=${uid}`;
    const cacheKey = `craftlandProfile-${region}-${uid}`;
    fetchFromApi(url, res, cacheKey);
});

app.get('/api/v1/craftlandInfo', (req, res) => {
    const { region, map_code } = req.query;
    if (!region || !map_code) {
        return res.status(400).json({ error: 'Please provide both "region" and "map_code" parameters.' });
    }
    if (!isValidRegion(region)) {
        return res.status(400).json({ error: `Region ${region} is not supported. Supported regions are: ${supportedRegions.join(', ')}` });
    }
    const url = `${BASE_URL}/craftlandInfo?region=${region}&map_code=${map_code}`;
    const cacheKey = `craftlandInfo-${region}-${map_code}`;
    fetchFromApi(url, res, cacheKey);
});

app.get('/api/v1/playerstats', (req, res) => {
    const { region, uid } = req.query;
    if (!region || !uid) {
        return res.status(400).json({ error: 'Please provide both "region" and "uid" parameters.' });
    }
    if (!isValidRegion(region)) {
        return res.status(400).json({ error: `Region ${region} is not supported. Supported regions are: ${supportedRegions.join(', ')}` });
    }
    const url = `${BASE_URL}/playerstats?region=${region}&uid=${uid}`;
    const cacheKey = `playerstats-${region}-${uid}`;
    fetchFromApi(url, res, cacheKey);
});

app.get('/api/v1/wishlistitems', (req, res) => {
    const { region, uid } = req.query;
    if (!region || !uid) {
        return res.status(400).json({ error: 'Please provide both "region" and "uid" parameters.' });
    }
    if (!isValidRegion(region)) {
        return res.status(400).json({ error: `Region ${region} is not supported. Supported regions are: ${supportedRegions.join(', ')}` });
    }
    const url = `${BASE_URL}/wishlistitems?region=${region}&uid=${uid}`;
    const cacheKey = `wishlistitems-${region}-${uid}`;
    fetchFromApi(url, res, cacheKey);
});

app.get('/api/v1/guildInfo', (req, res) => {
    const { region, guildID } = req.query;
    if (!region || !guildID) {
        return res.status(400).json({ error: 'Please provide both "region" and "guildID" parameters.' });
    }
    if (!isValidRegion(region)) {
        return res.status(400).json({ error: `Region ${region} is not supported. Supported regions are: ${supportedRegions.join(', ')}` });
    }
    const url = `${BASE_URL}/guildInfo?region=${region}&guildID=${guildID}`;
    const cacheKey = `guildInfo-${region}-${guildID}`;
    fetchFromApi(url, res, cacheKey);
});

app.get('/', (req, res) => {
    res.json({ message: 'Welcome to the API! Please use the available endpoints.' });
});


app.get('/status', (req, res) => {
    const status = {
        status: 'OK',
        uptime: process.uptime(), 
        memoryUsage: process.memoryUsage(), 
        timestamp: new Date().toISOString(), 
        message: 'API is running smoothly'
    };
    
    res.json(status);
});

app.listen(port, () => {
    console.log(`Server is listening at http://localhost:${port}`);
});