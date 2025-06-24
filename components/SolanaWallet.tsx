import { useEffect, useState } from 'react';
import { usePrivy, useWallets } from '@privy-io/react-auth';
import { useSolanaWallets, useSignMessage } from '@privy-io/react-auth/solana';
import { Connection, PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { Button } from './ui/button';
import { useToast } from './ui/use-toast';

export function SolanaWallet() {
  const { login, ready, authenticated } = usePrivy();
  const { wallets } = useSolanaWallets();
  const { signMessage } = useSignMessage();
  const { toast } = useToast();
  const [balance, setBalance] = useState<number | null>(null);

  const solanaWallet = wallets[0];
  const connection = new Connection('https://api.mainnet-beta.solana.com');

  useEffect(() => {
    if (solanaWallet?.address) {
      fetchBalance();
    }
  }, [solanaWallet?.address]);

  const fetchBalance = async () => {
    if (!solanaWallet?.address) return;
    try {
      const balance = await connection.getBalance(new PublicKey(solanaWallet.address));
      setBalance(balance / LAMPORTS_PER_SOL);
    } catch (error) {
      console.error('Error fetching balance:', error);
    }
  };

  const handleSignMessage = async () => {
    if (!solanaWallet) return;
    try {
      const message = 'Hello from Vibe Coding Studio!';
      const signatureUint8Array = await signMessage({
        message: new TextEncoder().encode(message),
        options: {
          address: solanaWallet.address
        }
      });
      
      toast({
        title: 'Message Signed',
        description: `Signature: ${Buffer.from(signatureUint8Array).toString('hex')}`,
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to sign message',
        variant: 'destructive',
      });
    }
  };

  const handleSendTransaction = async () => {
    if (!solanaWallet) return;
    try {
      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: new PublicKey(solanaWallet.address),
          toPubkey: new PublicKey(solanaWallet.address), // Sending to self for demo
          lamports: LAMPORTS_PER_SOL * 0.001,
        })
      );

      const signature = await solanaWallet.sendTransaction!(transaction, connection);
      
      toast({
        title: 'Transaction Sent',
        description: `Signature: ${signature}`,
      });

      // Refresh balance after transaction
      await fetchBalance();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to send transaction',
        variant: 'destructive',
      });
    }
  };

  if (!ready) {
    return <div>Loading...</div>;
  }

  if (!authenticated) {
    return (
      <Button onClick={login} className="w-full">
        Connect Wallet
      </Button>
    );
  }

  return (
    <div className="space-y-4 p-4 border rounded-lg">
      <div className="flex flex-col gap-2">
        <h2 className="text-lg font-bold">Solana Wallet</h2>
        {solanaWallet ? (
          <>
            <p className="text-sm text-muted-foreground">
              Address: {solanaWallet.address}
            </p>
            <p className="text-sm text-muted-foreground">
              Balance: {balance !== null ? `${balance.toFixed(4)} SOL` : 'Loading...'}
            </p>
            <div className="flex gap-2">
              <Button onClick={handleSignMessage} variant="outline" size="sm">
                Sign Message
              </Button>
              <Button onClick={handleSendTransaction} variant="outline" size="sm">
                Send Transaction
              </Button>
              <Button onClick={fetchBalance} variant="outline" size="sm">
                Refresh Balance
              </Button>
            </div>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">No wallet connected</p>
        )}
      </div>
    </div>
  );
} 