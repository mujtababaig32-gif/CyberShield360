using System.Net;
using System.Net.Sockets;

namespace CyberShield360.Infrastructure.Services;

/// <summary>
/// Blocks the scanner from ever connecting to a private, loopback, link-local
/// (including the 169.254.169.254 cloud metadata address), or otherwise
/// non-public network target. A tenant fully controls the DNS of the domains
/// it asks CyberShield360 to scan, so without this guard a tenant could point
/// an asset's DNS at an internal address and use the scanner as an SSRF proxy
/// into the hosting network.
/// </summary>
public static class SsrfProtection
{
    public static async Task<IPAddress> ResolvePublicAddressAsync(string host, CancellationToken ct)
    {
        IPAddress[] addresses = IPAddress.TryParse(host, out var literal)
            ? [literal]
            : await Dns.GetHostAddressesAsync(host, ct);

        var publicAddress = addresses.FirstOrDefault(address => !IsBlockedAddress(address));

        if (publicAddress is null)
        {
            throw new InvalidOperationException(
                $"Refusing to connect to '{host}': it resolves only to private, loopback, or reserved network addresses.");
        }

        return publicAddress;
    }

    public static bool IsBlockedAddress(IPAddress address)
    {
        if (address.IsIPv4MappedToIPv6)
        {
            address = address.MapToIPv4();
        }

        if (IPAddress.IsLoopback(address))
        {
            return true;
        }

        if (address.AddressFamily == AddressFamily.InterNetwork)
        {
            var b = address.GetAddressBytes();

            if (b[0] == 10) return true; // 10.0.0.0/8
            if (b[0] == 172 && b[1] is >= 16 and <= 31) return true; // 172.16.0.0/12
            if (b[0] == 192 && b[1] == 168) return true; // 192.168.0.0/16
            if (b[0] == 169 && b[1] == 254) return true; // 169.254.0.0/16 (incl. cloud metadata)
            if (b[0] == 127) return true; // 127.0.0.0/8 loopback
            if (b[0] == 0) return true; // 0.0.0.0/8
            if (b[0] == 100 && b[1] is >= 64 and <= 127) return true; // 100.64.0.0/10 CGNAT
            if (b[0] == 192 && b[1] == 0 && b[2] == 0) return true; // 192.0.0.0/24
            if (b[0] == 192 && b[1] == 0 && b[2] == 2) return true; // 192.0.2.0/24 documentation
            if (b[0] == 198 && b[1] is 18 or 19) return true; // 198.18.0.0/15 benchmarking
            if (b[0] == 198 && b[1] == 51 && b[2] == 100) return true; // 198.51.100.0/24 documentation
            if (b[0] == 203 && b[1] == 0 && b[2] == 113) return true; // 203.0.113.0/24 documentation
            if (b[0] >= 224) return true; // multicast (224/4) + reserved (240/4) + broadcast

            return false;
        }

        if (address.AddressFamily == AddressFamily.InterNetworkV6)
        {
            if (address.IsIPv6LinkLocal || address.IsIPv6SiteLocal || address.IsIPv6Multicast)
            {
                return true;
            }

            var b = address.GetAddressBytes();
            if ((b[0] & 0xFE) == 0xFC) return true; // fc00::/7 unique local

            return false;
        }

        return true;
    }

    public static async ValueTask<Stream> ConnectCallback(
        SocketsHttpConnectionContext context,
        CancellationToken cancellationToken)
    {
        var address = await ResolvePublicAddressAsync(context.DnsEndPoint.Host, cancellationToken);

        var socket = new Socket(SocketType.Stream, ProtocolType.Tcp) { NoDelay = true };

        try
        {
            await socket.ConnectAsync(address, context.DnsEndPoint.Port, cancellationToken);
            return new NetworkStream(socket, ownsSocket: true);
        }
        catch
        {
            socket.Dispose();
            throw;
        }
    }
}
