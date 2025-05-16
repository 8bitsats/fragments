import {
  NextRequest,
  NextResponse,
} from 'next/server'

import { getTemplateFiles } from '@/lib/templates.server'
import { Octokit } from '@octokit/rest'

export async function POST(req: NextRequest) {
  const payload = await req.json();

  // Example: handle repository.created event
  if (payload.action === 'created' && payload.repository) {
    const repoName = payload.repository.name;
    const owner = payload.repository.owner.login;
    const templateName = 'solana-dapp'; // or extract from payload

    // Use your GitHub App installation token here
    const octokit = new Octokit({ auth: process.env.GITHUB_APP_TOKEN });

    // Get template files
    const templateFiles = await getTemplateFiles(templateName, { projectName: repoName });

    // Commit each file to the new repo
    for (const file of templateFiles) {
      await octokit.repos.createOrUpdateFileContents({
        owner,
        repo: repoName,
        path: file.path,
        message: `Add ${file.path} from template`,
        content: Buffer.from(file.content).toString('base64'),
        committer: {
          name: 'Your Bot Name',
          email: 'bot@example.com'
        },
        author: {
          name: 'Your Bot Name',
          email: 'bot@example.com'
        }
      });
    }

    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ ok: false, reason: 'Not a handled event' }, { status: 400 });
} 