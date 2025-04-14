const form = document.querySelector('form')
const chatfield = document.getElementById('chatfield')
const responseArea = document.getElementById('responseArea')
const submitBtn = document.getElementById('submitBtn')

let messages = JSON.parse(localStorage.getItem("myChatHistory") || "[]")

form.addEventListener('submit', askQuestion)

async function askQuestion(e) {
  e.preventDefault()

  const prompt = chatfield.value.trim()
  if (!prompt) return

  submitBtn.disabled = true
  responseArea.textContent = "Even het weer checken en advies ophalen..."

  messages.push(["human", prompt])
  localStorage.setItem("myChatHistory", JSON.stringify(messages))

  const options = {
    method: 'POST',
    mode: 'cors',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      prompt,
      location: "Amsterdam" // optioneel, kan dynamisch worden
    })
  }

  try {
    const response = await fetch('http://localhost:3000/', options)
    const data = await response.json()

    if (data.message) {
      responseArea.textContent = data.message
      messages.push(["assistant", data.message])
      localStorage.setItem("myChatHistory", JSON.stringify(messages))
    } else {
      responseArea.textContent = "Geen advies ontvangen 😕"
    }
  } catch (err) {
    responseArea.textContent = "Fout bij ophalen advies."
    console.error(err)
  } finally {
    submitBtn.disabled = false
    chatfield.value = ''
  }
}