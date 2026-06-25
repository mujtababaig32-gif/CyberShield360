# syntax=docker/dockerfile:1

FROM mcr.microsoft.com/dotnet/aspnet:9.0 AS base
WORKDIR /app
EXPOSE 8080
ENV ASPNETCORE_URLS=http://+:8080

FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /src

COPY ["Directory.Build.props", "./"]
COPY ["src/CyberShield360.Domain/CyberShield360.Domain.csproj", "src/CyberShield360.Domain/"]
COPY ["src/CyberShield360.Application/CyberShield360.Application.csproj", "src/CyberShield360.Application/"]
COPY ["src/CyberShield360.Infrastructure/CyberShield360.Infrastructure.csproj", "src/CyberShield360.Infrastructure/"]
COPY ["src/CyberShield360.API/CyberShield360.API.csproj", "src/CyberShield360.API/"]

RUN dotnet restore "src/CyberShield360.API/CyberShield360.API.csproj"

COPY . .

RUN dotnet publish "src/CyberShield360.API/CyberShield360.API.csproj" -c Release -o /app/publish /p:UseAppHost=false

FROM base AS final
WORKDIR /app
COPY --from=build /app/publish .

ENTRYPOINT ["dotnet", "CyberShield360.API.dll"]