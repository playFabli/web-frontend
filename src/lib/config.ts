const isProduction = false;
export const config = {
	api: isProduction ? "https://backend.playfabli.com/api" : "http://127.0.0.1:8000/api",
	avatarStorage: isProduction ? "https://backend.playfabli.com/storage/avatars" : "http://127.0.0.1:8000/storage/avatars",
	headshotStorage: isProduction ? "https://backend.playfabli.com/storage/headshots" : "http://127.0.0.1:8000/storage/headshots",
	storage: isProduction ? "https://backend.playfabli.com/storage" : "http://127.0.0.1:8000/storage",
	paymentOfferId: `ad4d1282-9669-488f-8564-4911dea511f2`,
	internalApi: isProduction ? "http://127.0.0.1:8080/api" : "http://127.0.0.1:8000/api",
	recaptchaSiteKey: `6Le0F10tAAAAAHqha0Yv9PY-ThwxwKFhfqKkPdXj`
}