// server.js

import express from 'express'
import cors from 'cors'
import fetch from 'node-fetch'
import { config } from 'dotenv'
import { AzureChatOpenAI } from '@langchain/openai'

// .env bestand inladen (voor WEATHER_API_KEY)
config()

const app = express()
const PORT = 3000

// Middleware
app.use(cors())
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Chat model instellen
const model = new AzureChatOpenAI({
  temperature: 0.3,
  maxTokens: 100
})

// POST endpoint voor cabrio advies
app.post('/', async (req, res) => {
  const userPrompt = req.body.prompt
  const location = req.body.location || 'Amsterdam'

  try {
    const weatherData = await getWeather(location)
    const engineeredPrompt = buildPrompt(userPrompt, weatherData)

    const response = await model.invoke([
      {
        role: 'system',
        content: `Je bent een cabrio-advies expert. Beantwoord de gebruiker of ze vandaag comfortabel met een cabrio kunnen rijden, en geef suggesties voor geschikte kleding op basis van het weer.`
      },
      {
        role: 'user',
        content: engineeredPrompt
      }
    ])

    res.json({ message: response.content })
  } catch (error) {
    console.error('Fout bij verwerking:', error)
    res.status(500).json({ error: 'Fout bij ophalen van advies of weerdata.' })
  }
})

// Functie om weerdata op te halen
async function getWeather(location) {
  const apiKey = process.env.WEATHER_API_KEY
  console.log("Gebruik deze API key:", apiKey)
  const url = `http://api.weatherapi.com/v1/current.json?key=${apiKey}&q=${location}&aqi=no`
  console.log(`Fetching weer voor ${location} met URL: ${url}`)
  console.log("API URL:", url)

  const response = await fetch(url)
  if (!response.ok) throw new Error(`Weerdata ophalen mislukt voor ${location}`)

  const data = await response.json()

  return {
    location: data.location.name,
    temp: data.current.temp_c,
    condition: data.current.condition.text,
    rain: data.current.precip_mm,
    wind: data.current.wind_kph,
    is_day: data.current.is_day
  }
}

// Functie om prompt te bouwen met weersinformatie
function buildPrompt(userPrompt, weather) {
  return `
De huidige weerssituatie in ${weather.location}:
- Temperatuur: ${weather.temp}°C
- Weerconditie: ${weather.condition}
- Neerslag: ${weather.rain} mm
- Windsnelheid: ${weather.wind} km/h
- Daglicht: ${weather.is_day ? 'ja' : 'nee'}

Gebruikersvraag: "${userPrompt}"

Beoordeel of cabriorijden aan te raden is vandaag. Geef daarnaast kledingadvies gebaseerd op het weer.
  `.trim()
}

// Server starten
app.listen(PORT, () => {
  console.log(`Server draait op http://localhost:${PORT}`)
})