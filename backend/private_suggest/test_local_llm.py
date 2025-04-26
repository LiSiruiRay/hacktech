import openai

openai.api_key = "lm-studio"  # Doesn't matter if LM Studio doesn't check
openai.api_base = "https://a8ea-131-215-220-32.ngrok-free.app/v1"  # <- your ngrok URL

response = openai.ChatCompletion.create(
    model="qwq-32b",
    messages=[{"role": "user", "content": "Hello!"}],
    extra_headers={
        "ngrok-skip-browser-warning": "true"
    }
)

print(response.choices[0].message["content"])
