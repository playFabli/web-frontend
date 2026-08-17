p = r"C:\Users\Daniel\Downloads\fabli\frontend\src\routes\(auth)\arena\+page.svelte"
src = open(p, encoding="utf-8").read()
lines = src.splitlines()
print("=== avatarCanvas/refs (38-44) ===")
for i in range(37, 44):
    print(i+1, repr(lines[i]))
print("=== closeMatchmakingModal (84-94) ===")
for i in range(83, 94):
    print(i+1, repr(lines[i]))
print("=== setupAvatarPreview sig (178-186) ===")
for i in range(177, 186):
    print(i+1, repr(lines[i]))
print("=== modal img blocks (656,683) ===")
for i in range(655, 683):
    print(i+1, repr(lines[i]))