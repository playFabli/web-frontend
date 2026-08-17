import sys

p = r"C:\Users\Daniel\Downloads\fabli\frontend\src\routes\(auth)\arena\+page.svelte"
src = open(p, encoding="utf-8").read()

def T(n):
    return "\t" * n

def must_replace(s, old, new, label):
    c = s.count(old)
    if c != 1:
        print("FAIL", label, "count=", c); sys.exit(1)
    print("OK", label, "count=", c)
    return s.replace(old, new)

# EDIT 1: fix setupAvatarPreview signature (dedent decl to 1 tab) + add onError
old1 = (
    "\t\tfunction setupAvatarPreview(scene: Scene, canvas: HTMLCanvasElement, userId?: number | string, token?: string): void {\n"
    "\t\tconst authToken = (token ?? page.data.token) as string;\n"
    "\t\t// Authenticated user is the default; an explicit userId lets the caller\n"
    "\t\t// materialise any user's outfit (e.g. the robot opponent, user id 2).\n"
    "\t\tconst targetUserId = userId ?? (page.data.user?.id as number);"
)
new1 = (
    "\tfunction setupAvatarPreview(scene: Scene, canvas: HTMLCanvasElement, userId?: number | string, token?: string, onError?: (msg: string) => void): void {\n"
    "\t\tconst authToken = (token ?? page.data.token) as string;\n"
    "\t\tconst reportError = onError ?? ((msg: string) => { avatarError = msg; });\n"
    "\t\t// Authenticated user is the default; an explicit userId lets the caller\n"
    "\t\t// materialise any user's outfit (e.g. the robot opponent, user id 2).\n"
    "\t\tconst targetUserId = userId ?? (page.data.user?.id as number);"
)
src = must_replace(src, old1, new1, "setupAvatarPreview signature")

# EDIT 2: colors fetch URL -> add ?user_id=
src = must_replace(src, "${config.api}/user/avatar/colors`,", "${config.api}/user/avatar/colors?user_id=${targetUserId}`,", "colors url")

# EDIT 3: manifest fetch URL -> add ?user_id=
src = must_replace(src, "${config.api}/arena/avatar`,", "${config.api}/arena/avatar?user_id=${targetUserId}`,", "manifest url")

# EDIT 4: Bearer ${token} -> Bearer ${authToken} (both fetches)
before = src.count("`Bearer ${token}`")
src = src.replace("`Bearer ${token}`", "`Bearer ${authToken}`")
after = src.count("`Bearer ${token}`") + src.count("`Bearer ${authToken}`")
print("OK bearer token replaced, was=", before, "now-token=", src.count("`Bearer ${token}`"), "authToken=", src.count("`Bearer ${authToken}`"))
if src.count("`Bearer ${token}`") != 0:
    print("FAIL leftover bare ${token}"); sys.exit(1)

# EDIT 5: avatarError -> reportError
src = must_replace(src, 'avatarError = "Could not load your avatar.";', 'reportError("Could not load your avatar.");', "reportError call")

# EDIT 6: insert mountAvatarEngine after setupAvatarPreview close
mount_func = "\n".join([
    "",
    "/**",
    " * Create a throwaway Babylon engine + scene that renders a single 3D avatar",
    " * preview onto `canvas` for `userId` (defaults to the current user). Mirrors",
    " * the lobby showcase, but is lightweight and explicitly disposeable - which",
    " * the matchmaking modal needs for its You/Robot thumbnails.",
    " */",
    "function mountAvatarEngine(canvas: HTMLCanvasElement, userId?: number | string, token?: string): () => void {",
    "\tif (!canvas) return () => {};",
    "\tcanvas.style.imageRendering = \"pixelated\";",
    "\tcanvas.style.imageRendering = \"crisp-edges\";",
    "\tconst engine = new Engine(canvas, true, {",
    "\t\talpha: true,",
    "\t\tpremultipliedAlpha: false,",
    "\t\tadaptToDeviceRatio: true,",
    "\t\tantialias: true,",
    "\t});",
    "\tconst scene = new Scene(engine);",
    "\tscene.clearColor = new Color4(0, 0, 0, 0);",
    "\tscene.skipPointerMovePicking = true;",
    "\tscene.ambientColor = new Color3(0.8, 0.8, 0.8);",
    "",
    "\tsetupAvatarPreview(scene, canvas, userId, token, () => {});",
    "\tengine.setHardwareScalingLevel(1.0);",
    "",
    "\tengine.runRenderLoop(() => {",
    "\t\tscene.render();",
    "\t});",
    "",
    "\tconst handleResize = () => engine.resize();",
    "\twindow.addEventListener(\"resize\", handleResize);",
    "",
    "\treturn () => {",
    "\t\twindow.removeEventListener(\"resize\", handleResize);",
    "\t\tscene.dispose();",
    "\t\tengine.dispose();",
    "\t};",
    "}",
])
anchor6 = "\t}\n\n\t// The user's saved body colors. GET /api/user/avatar/colors returns these"
src = must_replace(src, anchor6, "\t}\n\n" + mount_func + "\n\n\t// The user's saved body colors. GET /api/user/avatar/colors returns these", "mountAvatarEngine insert")

open(p, "w", encoding="utf-8", newline="\n").write(src)
print("SCRIPT A DONE")
