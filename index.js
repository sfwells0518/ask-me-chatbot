import { Configuration, OpenAIApi } from "openai";

const configuration = new Configuration({
  apiKey: import.meta.env.VITE_OpenAI_API_KEY,
});

const openai = new OpenAIApi(configuration);

const chatbotConversation = document.getElementById("chatbot-conversation");

const conversationArr = [
  {
    role: "system",
    content: "You are a highly knowledgeable assistant that is always happy to help."
  }
];

document.addEventListener("submit", (e) => {
  e.preventDefault();
  const userInput = document.getElementById("user-input");
  conversationArr.push({
    role: "user",
    content: userInput.value
  });
  fetchReply(conversationArr);
  const newSpeechBubble = document.createElement('div');
  newSpeechBubble.classList.add("speech", "speech-human");
  chatbotConversation.appendChild(newSpeechBubble);
  newSpeechBubble.textContent = userInput.value;
  userInput.value = "";
  chatbotConversation.scrollTop = chatbotConversation.scrollHeight;
});

async function fetchReply(conversationArr) {
  try {
    const prompt = JSON.stringify(conversationArr);
    const response = await openai.createChatCompletion({
      model: "gpt-3.5-turbo",
      messages: [
        { "role": "assistant", "content": "You are a helpful assistant." }, { role: "user", content: prompt }
      ],
      presence_penalty: 0,
      frequency_penalty: 0.3
    });
    conversationArr.push(response.data.choices[0].message);
    renderTypewriterText(response.data.choices[0].message.content);
  } catch (error) {
    console.error(error);
  }
}
    
function renderTypewriterText(text) {
  const newSpeechBubble = document.createElement("div");
  newSpeechBubble.classList.add("speech", "speech-ai", "blinking-cursor");
  chatbotConversation.appendChild(newSpeechBubble);
  let i = 0;
  function animate() {
    newSpeechBubble.textContent = newSpeechBubble.textContent + text.slice(i - 1, i);
    if (text.length === i) {
      newSpeechBubble.classList.remove("blinking-cursor");
      return;
    }
    i++;
    chatbotConversation.scrollTop = chatbotConversation.scrollHeight;
    requestAnimationFrame(animate);
  }
  requestAnimationFrame(animate);
}
