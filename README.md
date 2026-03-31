# 🎮 UserRush - Web Game Development Event

## 🚀 Overview

We are organizing a **Web Game Development Event** where the goal is simple:

👉 Each team will build a **web-based game** using a starter template that we provide.

This template already includes:

- ✅ Google Login (restricted to institute emails)
- ✅ Backend tracking system
- ✅ Database integration
- ✅ User participation tracking

So you **do NOT need to build authentication or backend from scratch**.

👉 Your main focus: **Build an engaging game frontend**

---

## 🎯 What You Need to Do

Your job is to:

- 🎨 Design the game UI  
- 🎮 Implement game mechanics  
- 🧠 Create engaging gameplay  
- 🖱️ Handle user interaction  

Think beyond just making something functional.

👉 Build something people **actually enjoy playing**

---

## 👥 User Tracking System

Each team will receive a **unique GAME_ID**.

- Every logged-in user is tracked  
- Only institute Google accounts are allowed  
- Each user is counted **only once per game**  
- All data is stored centrally  

---

## 🏆 Scoring Criteria

Total = **100 Marks**

### 1. Judges Evaluation (50 marks)

Based on:

- Functionality  
- Creativity  
- UI/UX  
- Presentation  

---

### 2. User Engagement (50 marks)

- Based on number of valid users  
- Highest users = full marks  
- Others scored proportionally  

📊 A **live leaderboard** will be maintained.

---

## 📦 Submission Requirements

Each team must submit:

- 🌐 Deployed game link  
- 💻 GitHub repository link  
- 📝 Short explanation of game idea  

---

## ⚠️ Important Rules

- ❌ Do NOT modify authentication logic  
- ❌ Do NOT change backend tracking system  
- ✅ Only build your game frontend  
- ✅ Use the provided template correctly  

---

## 🧠 Why This Event Matters

This is not just a competition.

You will learn:

- Frontend development  
- Deployment  
- Authentication integration  
- Real-world system design  

---

# 🛠️ How to Use This Template

Follow these steps carefully 👇

---

## 1️⃣ Install & Run Project

```bash
npm install
npm run dev
```

---

## 2️⃣ Set Your GAME_ID

Go to:

```
src/constants.jsx
```

Update:

```js
export const GAME_ID = "your_game_id";
```

⚠️ This is VERY IMPORTANT  
👉 The GAME_ID should be your Roll number   
👉 This identifies you in leaderboard

---

## 3️⃣ Login System (Already Built)

The template already handles:

- Google login popup  
- Institute email restriction  
- Token generation  
- Backend verification  

👉 You **do not need to change anything here**

---

## 4️⃣ After Login Flow

- User logs in  
- Token is stored  
- User is tracked in backend  
- User is redirected to `/game`  

---

## 5️⃣ Build Your Game

Go to:

```
src/pages/game.jsx
```

👉 This is where YOU build your game.

You can:

- Replace existing UI  
- Add game logic  
- Create anything you want  

---

## 6️⃣  Deployment

After building your game:

- Deploy using Vercel / Netlify  
- Submit the deployed link  

---

# 📁 Project Structure

```
src/
│── pages/
│   │── login.jsx   → Login page (DO NOT MODIFY)
│   │── game.jsx    → Build your game here
│
│── constants/
│   │── config.js   → Set your GAME_ID
│
│── components/
│   │── ProtectedRoute.jsx → Route protection
```

---

# 🔥 Tips for Winning

- Make your game addictive 🎮  
- Keep UI clean and smooth ✨  
- Reduce loading time ⚡  
- Make it mobile friendly 📱  
- Add sound / animations 🔊  

---

# 🏁 Final Advice

👉 Don't just build a project  
👉 Build something people will share and play  

Because:

💡 **More players = higher score**

---

## 🚀 Good luck and have fun!
