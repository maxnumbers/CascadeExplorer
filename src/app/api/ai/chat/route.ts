import { NextRequest, NextResponse } from 'next/server';
import { execSync } from 'child_process';

/**
 * Server-side proxy for AI chat completions.
 * Uses curl under the hood to respect the environment's HTTP proxy settings,
 * which Node.js built-in fetch does not do automatically.
 */
export async function POST(request: NextRequest) {
  try {
    const { endpoint, headers, body } = await request.json();

    if (!endpoint) {
      return NextResponse.json(
        { error: 'Missing endpoint' },
        { status: 400 }
      );
    }

    // Build curl command with headers
    const headerArgs = Object.entries(headers || {})
      .map(([key, value]) => `-H ${JSON.stringify(`${key}: ${value}`)}`)
      .join(' ');

    const bodyStr = typeof body === 'string' ? body : JSON.stringify(body);

    // Use curl which respects the environment proxy settings
    const curlCmd = `curl -s -w "\\n%{http_code}" --max-time 120 -X POST ${headerArgs} -d ${JSON.stringify(bodyStr)} ${JSON.stringify(endpoint)}`;

    const result = execSync(curlCmd, {
      encoding: 'utf-8',
      timeout: 130000,
    });

    // Parse response: body is everything before the last line, status code is the last line
    const lines = result.trimEnd().split('\n');
    const statusCode = parseInt(lines.pop() || '500', 10);
    const responseBody = lines.join('\n');

    try {
      const data = JSON.parse(responseBody);
      return NextResponse.json(data, { status: statusCode });
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON from AI provider', raw: responseBody.substring(0, 500) },
        { status: 502 }
      );
    }
  } catch (error) {
    console.error('AI proxy error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Proxy request failed' },
      { status: 500 }
    );
  }
}
