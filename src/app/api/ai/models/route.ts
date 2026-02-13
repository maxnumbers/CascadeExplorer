import { NextRequest, NextResponse } from 'next/server';
import { execSync } from 'child_process';

/**
 * Server-side proxy for fetching model lists from AI providers.
 * Uses curl to respect the environment's HTTP proxy settings.
 *
 * Query params:
 * - endpoint: the full URL to fetch models from (e.g. https://api.cerebras.ai/v1/models)
 * - apiKey: (optional) Bearer token for authorization
 */
export async function GET(request: NextRequest) {
  try {
    const endpoint = request.nextUrl.searchParams.get('endpoint');
    const apiKey = request.nextUrl.searchParams.get('apiKey');

    if (!endpoint) {
      return NextResponse.json({ error: 'Missing endpoint parameter' }, { status: 400 });
    }

    // Build curl command
    const headerArgs = ['-H "Content-Type: application/json"'];
    if (apiKey) {
      headerArgs.push(`-H "Authorization: Bearer ${apiKey}"`);
    }

    const curlCmd = `curl -s -w "\\n%{http_code}" --max-time 15 ${headerArgs.join(' ')} ${JSON.stringify(endpoint)}`;

    const result = execSync(curlCmd, {
      encoding: 'utf-8',
      timeout: 20000,
    });

    const lines = result.trimEnd().split('\n');
    const statusCode = parseInt(lines.pop() || '500', 10);
    const responseBody = lines.join('\n');

    try {
      const data = JSON.parse(responseBody);
      return NextResponse.json(data, { status: statusCode });
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON from provider', raw: responseBody.substring(0, 500) },
        { status: 502 }
      );
    }
  } catch (error) {
    console.error('Models proxy error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch models' },
      { status: 500 }
    );
  }
}
