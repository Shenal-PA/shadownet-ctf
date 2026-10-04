#!/usr/bin/env python3

import socket
import sys
import os
from threading import Thread

#server config
HOST = '0.0.0.0'
PORT = 5000
KEY = "SECRET"
ENCRYPTED_FLAG = "GJSOV HDWSJ FZRMX RYMTC GYQWZ"

def vigenere_encrypt(plaintext, key):
    ciphertext = ""
    key_index = 0

    for char in plaintext.upper():
        if char.isalpha():
            shift = ord(key[key_index % len(key)].upper()) - ord('A')
            encrypted_char = chr((ord(char) - ord('A') + shift) % 26 + ord('A'))
            ciphertext += encrypted_char
            key_index += 1
        else:
            ciphertext += char
    return ciphertext

def handle_client(client_socket, address):
    print(f"[+] Connection from {address}")
    try:
        client_socket.send(f"=== Encryption Oracle Service ===\n".encode())
        client_socket.send(f"Target flag : {ENCRYPTED_FLAG}\n".encode())
        client_socket.send(f"Send plaintext to encrypt (type 'quit' to exit):\n".encode())

        while True:
            raw_data = client_socket.recv(1024)
            if not raw_data:
                break

            data = raw_data.decode(errors='ignore').strip()

            if not data or data.lower() in ['quit', 'exit']:
                client_socket.send(b"Goodbye!\n")
                break

            if len(data) > 1000:
                client_socket.send(b"Error: Input too long\n")
                continue

            #encrypt the input
            encrypted = vigenere_encrypt(data, KEY)
            client_socket.send(f"Encrypted: {encrypted}\n".encode())

            target_clean = ENCRYPTED_FLAG.replace(" ", "")
            if encrypted.replace(" ", "") == target_clean:
                flag = os.getenv("FLAG", "SHADOWNET{7h_0f_7h3_3ncrypt10n_1s_4w3s0m3}")
                client_socket.send(f"\n[+] Congratulations! Correct Decryption!\n[+] Flag: {flag}\n".encode())
                break

            print(f"[*] Client {address}: encrypted '{data}' to '{encrypted}'")

    except Exception as e:
        print(f"[!] Error handling client {address}: {e}")
    finally:
        client_socket.close()
        print(f"[-] Connection from {address} closed.")

def main():
    server_socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    server_socket.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    server_socket.bind((HOST, PORT))
    server_socket.listen(5)

    print(f"[+] Encryption Oracle listening on {HOST}:{PORT}")
    print(f"[+] Key: {KEY}")
    print(f"[+] Encrypted Flag: {ENCRYPTED_FLAG}")

    try:
        while True:
            client_socket, address = server_socket.accept()
            client_thread = Thread(target=handle_client, args=(client_socket, address))
            client_thread.daemon = True
            client_thread.start()
    except KeyboardInterrupt:
        print("\n[*] Shutting down...")
    finally:
        server_socket.close()

if __name__ == "__main__":
    main()