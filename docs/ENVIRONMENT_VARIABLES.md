# CyberShield360 Environment Variables

Use these in your backend hosting dashboard. Do not put real secrets in source code.

## Backend API variables

```text
ASPNETCORE_ENVIRONMENT=Production
ASPNETCORE_URLS=http://+:8080
ConnectionStrings__DefaultConnection=YOUR_HOSTED_SQL_CONNECTION_STRING
Jwt__Issuer=CyberShield360
Jwt__Audience=CyberShield360
Jwt__Secret=GENERATE_A_64_PLUS_CHARACTER_RANDOM_SECRET
Cors__Origins__0=https://YOUR-VERCEL-FRONTEND.vercel.app
SeedOnStartup=false
EnableSwagger=false
Smtp__Host=smtp.gmail.com
Smtp__Port=587
Smtp__Username=YOUR_GMAIL_OR_SMTP_USERNAME
Smtp__Password=YOUR_GMAIL_APP_PASSWORD_OR_SMTP_PASSWORD
Smtp__FromEmail=YOUR_VERIFIED_SENDER_EMAIL
Smtp__FromName=CyberShield360
Smtp__EnableSsl=true
GoogleAuth__ClientId=YOUR_GOOGLE_CLIENT_ID
GoogleAuth__ClientSecret=
OpenAI__ApiKey=
OpenAI__Model=gpt-4.1-mini
LemonSqueezy__ApiKey=
LemonSqueezy__StoreId=
LemonSqueezy__VariantId=
LemonSqueezy__WebhookSecret=
```

## Frontend Vercel variable

Set this inside Vercel Project Settings → Environment Variables:

```text
VITE_API_BASE=https://YOUR-BACKEND-API-DOMAIN/api/v1
```

After changing Vercel environment variables, redeploy the frontend.
