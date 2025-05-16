import React from 'react'

export function DeployToFunPumpButton({ repoUrl }: { repoUrl: string }) {
  const handleDeploy = async () => {
    const response = await fetch('/api/deploy-to-funpump', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ repoUrl }),
    });
    const { deployUrl } = await response.json();
    window.open(deployUrl, '_blank');
  };

  return (
    <button onClick={handleDeploy} className="btn-funpump flex items-center gap-2 px-4 py-2 rounded bg-green-600 text-white hover:bg-green-700">
      <img src="/thirdparty/logos/funpump.svg" alt="FunPump" className="inline h-5 w-5" />
      Deploy to FunPump
    </button>
  );
} 