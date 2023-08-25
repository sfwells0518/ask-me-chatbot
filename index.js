import { Configuration, OpenAIApi } from "openai";
import { initializeApp } from 'firebase/app'; 
import { getDatabase, ref, push, get, remove } from 'firebase/database';

const configuration = new Configuration({
  apiKey: import.meta.env.VITE_OpenAI_API_KEY,
});

const firebaseConfig = {
  databaseURL: "https://askme-openai-default-rtdb.firebaseio.com/",
};

const app = initializeApp(firebaseConfig);

const database = getDatabase(app);

const conversationInDb = ref(database);

const openai = new OpenAIApi(configuration);

const chatbotConversation = document.getElementById("chatbot-conversation");

const instructionObj = {
  role: "system",
  content:
    "You are both a pediatrician and a parent. Engage in a back-and-forth conversation with the user, paying close attention to the user's questions and context. Offer warm, actionable and concise advice in 50 words or less, ensuring your responses are relevant to the user's query.",
};

const userInput = document.getElementById('user-input');
const suggestionButtons = document.querySelector('.suggested-prompts');
const promptToggle = document.getElementById('prompt-toggle');
const clearButton = document.getElementById('clear-btn');


userInput.addEventListener("input", () => {
  const trimmedInput = userInput.value.trim();

  if (trimmedInput !== "") {
    suggestionButtons.style.display = "none";
    promptToggle.style.display = "none";
  } else {
    suggestionButtons.style.display = "grid";
    promptToggle.style.display = "flex";
  }
});

function resetConversation() {
  chatbotConversation.innerHTML = '';
  userInput.value = '';
  suggestionButtons.style.display = 'grid';
}

clearButton.addEventListener('click', () => {
  resetConversation();
});

document.addEventListener("submit", (e) => {
  e.preventDefault();
  const userInput = document.getElementById("user-input");
  push(conversationInDb, {
    role: "user",
    content: userInput.value
  });
  fetchReply();
  const newSpeechBubble = document.createElement('div');
  newSpeechBubble.classList.add("speech", "speech-human");
  chatbotConversation.appendChild(newSpeechBubble);
  newSpeechBubble.textContent = userInput.value;
  userInput.value = "";
  chatbotConversation.scrollTop = chatbotConversation.scrollHeight;
});

function fetchReply() {
  get(conversationInDb).then(async (snapshot) => {
    if (snapshot.exists()) {
      const conversationArr = Object.values(snapshot.val());
      conversationArr.unshift(instructionObj);
      const prompt = JSON.stringify(conversationArr);
      const response = await openai.createChatCompletion({
        model: "gpt-4",
        messages: conversationArr,
        presence_penalty: 0,
        frequency_penalty: 0.3
      });
      push(conversationInDb, response.data.choices[0].message);
      renderTypewriterText(response.data.choices[0].message.content);
    } else {
      console.log("No data available");
    }
  });
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

document.getElementById("clear-btn").addEventListener("click", () => {
  remove(conversationInDb);
  chatbotConversation.innerHTML =
    '<div class="speech speech-ai">Hey, newbie parent! What can I help you with today?</div>';
});

let suggestionHidden = false; // Initial State
suggestionButtons.style.opacity = "1";
suggestionButtons.style.transform = "translateX(-50%) translateY(0)";
promptToggle.style.transform = "translateY(0)";
const promptToggleText = document.querySelector("#prompt-toggle h5");
const hideIcon = document.querySelector(".hide-icon");
const showIcon = document.querySelector(".show-icon");

document.getElementById("prompt-toggle").addEventListener("click", () => {
  if (suggestionHidden) {
    suggestionButtons.style.opacity = "1";
    suggestionButtons.style.transform = "translateX(-50%) translateY(0)";
    promptToggle.style.transform = "translateY(0)";
    promptToggleText.textContent = "Hide Suggested Prompts";
    hideIcon.style.display = "inline-block";
    showIcon.style.display = "none";
  } else {
    suggestionButtons.style.opacity = "0";
    suggestionButtons.style.transform = "translateX(-50%) translateY(100%)"; // Move it downwards
    promptToggle.style.transform = "translateY(185px)"; // Move it half the height downwards
    promptToggleText.textContent = "Show Suggested Prompts";
    hideIcon.style.display = "none";
    showIcon.style.display = "inline-block";
  }
  suggestionHidden = !suggestionHidden; // Toggle the state
});


function renderConversationFromDb() {
  get(conversationInDb).then((snapshot) => {
    if (snapshot.exists()) {
      Object.values(snapshot.val()).forEach((dbObj) => {
        const newSpeechBubble = document.createElement("div");
        newSpeechBubble.classList.add("speech", `speech-${dbObj.role === "user" ? "human" : "ai"}`);
        chatbotConversation.appendChild(newSpeechBubble);
        newSpeechBubble.textContent = dbObj.content;
      });
      chatbotConversation.scrollTop = chatbotConversation.scrollHeight;

      suggestionButtons.style.display = 'none';
      promptToggle.style.display = "none";
    } else {
      suggestionButtons.style.display = 'grid';
      promptToggle.style.display = "flex";
    }
  });
}
renderConversationFromDb();