import React, { useState } from 'react'
import { Button } from './ui/button'
import { LoaderIcon } from 'lucide-react'
import { useToast } from './ui/use-toast'

export function DeployToFunPumpButton({ repoUrl }: { repoUrl: string }) {
  const [isDeploying, setIsDeploying] = useState(false);
  const { toast } = useToast();

  const handleDeploy = async () => {
    if (!repoUrl) {
      toast({
        title: "Missing Repository URL",
        description: "Please provide a valid repository URL to deploy.",
        variant: "destructive",
      });
      return;
    }

    setIsDeploying(true);
    try {
      const response = await fetch('/api/deploy-to-funpump', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repoUrl }),
      });

      if (!response.ok) {
        throw new Error('Failed to initiate deployment');
      }

      const data = await response.json();
      
      if (!data.deployUrl) {
        throw new Error('No deployment URL received');
      }

      // Open deployment URL in new tab
      window.open(data.deployUrl, '_blank');
      
      toast({
        title: "Deployment Initiated",
        description: "Your application is being deployed to FunPump.",
      });
    } catch (error) {
      console.error('Deployment error:', error);
      toast({
        title: "Deployment Failed",
        description: error instanceof Error ? error.message : "An error occurred during deployment.",
        variant: "destructive",
      });
    } finally {
      setIsDeploying(false);
    }
  };

  return (
    <Button 
      onClick={handleDeploy} 
      disabled={isDeploying || !repoUrl}
      variant="outline"
      className="relative group hover:bg-green-50 dark:hover:bg-green-950/30"
    >
      <div className="flex items-center gap-2">
        <img 
          src="/thirdparty/logos/funpump.svg" 
          alt="FunPump" 
          className="h-5 w-5 transition-transform group-hover:scale-110" 
        />
        <span className="text-green-700 dark:text-green-400">
          {isDeploying ? (
            <div className="flex items-center gap-2">
              <LoaderIcon className="h-4 w-4 animate-spin" />
              Deploying...
            </div>
          ) : (
            'Deploy to FunPump'
          )}
        </span>
      </div>
    </Button>
  );
} 