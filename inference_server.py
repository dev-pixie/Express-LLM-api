from transformers import AutoTokenizer, AutoModelForCausalLM, TextIteratorStreamer
import torch
import sys
from threading import Thread

model_name = "gpt2"
tokenizer = AutoTokenizer.from_pretrained(model_name)
model = AutoModelForCausalLM.from_pretrained(model_name)
model.eval()

print("__READY__", flush=True)

while True:
    try:
        prompt = sys.stdin.readline()
        if not prompt:
            continue

        prompt = prompt.strip()
        inputs = tokenizer(prompt, return_tensors="pt")
        streamer = TextIteratorStreamer(tokenizer, skip_prompt=True)

        def generate():
            with torch.no_grad():
                model.generate(
                    **inputs, 
                    streamer=streamer, 
                    max_new_tokens=300,
                    repetition_penalty=1.2,
                    pad_token_id=tokenizer.eos_token_id,
                    eos_token_id=tokenizer.eos_token_id,
                    )

        thread = Thread(target=generate)
        thread.start()

        for token in streamer:
            print(token, end='', flush=True)

        print("\n__END__", flush=True)

    except Exception as e:
        print(f"\n__ERROR__:{e}", file=sys.stderr, flush=True)
        print("__END__", flush=True)
