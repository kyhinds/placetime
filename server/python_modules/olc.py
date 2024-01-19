# olc_helper.py
import sys
import json
from openlocationcode import openlocationcode as olc

def encode(latitude, longitude, code_length=10):
    return olc.encode(latitude, longitude, code_length)

def decode(plus_code):
    return olc.decode(plus_code)

def main():
    # Receive JSON input from stdin
    input_data = json.loads(sys.stdin.read())
    command = input_data['command']

    if command == 'encode':
        latitude = input_data['latitude']
        longitude = input_data['longitude']
        code_length = input_data.get('code_length', 10)
        result = encode(latitude, longitude, code_length)
    elif command == 'decode':
        plus_code = input_data['plus_code']
        result = decode(plus_code)

    # Send result back as JSON
    print(json.dumps(result))

if __name__ == "__main__":
    main()
