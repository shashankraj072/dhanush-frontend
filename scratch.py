import os
import google.generativeai as genai

# Setup dummy API key if we don't have one, but we expect an error if invalid
api_key = os.environ.get("GEMINI_API_KEY")
if not api_key:
    print("No API key, can't test")
    exit(1)

genai.configure(api_key=api_key)
model = genai.GenerativeModel('gemini-1.5-flash-latest')

messages = [
    {"role": "user", "content": "hello"}
]

history = []
last_role = None
for msg in messages[:-1]:
    role = "user" if msg['role'] == "user" else "model"
    if role == "model" and not history:
        continue
    if role == last_role:
        history[-1]["parts"][0] += "\n\n" + msg['content']
    else:
        history.append({"role": role, "parts": [msg['content']]})
        last_role = role

try:
    chat_session = model.start_chat(history=history)
    response = chat_session.send_message(messages[-1]['content'])
    print(response.text)
except Exception as e:
    print("Error:", repr(e))
