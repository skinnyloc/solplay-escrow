import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import Link from 'next/link';

export default function HomePage() {
  const { publicKey } = useWallet();

  const games = [
    {
      name: 'Chess',
      emoji: '♟️',
      description: 'Classic strategy game',
      href: '/games/chess',
      available: true,
    },
    {
      name: 'Checkers',
      emoji: '🔴',
      description: 'Jump and capture',
      href: '/games/checkers',
      available: false,
    },
    {
      name: 'Connect Four',
      emoji: '🔵',
      description: 'Four in a row wins',
      href: '/games/connect-four',
      available: false,
    },
    {
      name: 'Coin Flip',
      emoji: '🪙',
      description: 'Heads or tails',
      href: '/games/coin-flip',
      available: false,
    },
  ];

  return (
    <div className="min-h-screen bg-[#1a1f3a]">
      {/* Devnet Banner */}
      <div className="bg-purple-900/20 border-b border-purple-500/30">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <p className="text-purple-400 text-sm flex items-center gap-2">
              <span>🔧</span>
              <span className="font-medium">DEVNET MODE</span>
              <span className="text-purple-300">- Using test SOL</span>
              <a
                href="https://faucet.solana.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-teal-400 hover:underline ml-2"
              >
                Get free SOL →
              </a>
            </p>
            <WalletMultiButton />
          </div>
        </div>
      </div>

      {/* Header */}
      <header className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-6xl font-bold text-white mb-4">
            SolPlay <span className="text-teal-400">Escrow</span>
          </h1>
          <p className="text-xl text-gray-400 mb-2">
            Blockchain-powered gaming with real SOL wagers
          </p>
          <p className="text-sm text-gray-500">
            Trustless escrow • Instant payouts • 3% house fee
          </p>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-12">
        {!publicKey ? (
          <div className="max-w-2xl mx-auto text-center">
            <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-12">
              <div className="text-6xl mb-6">🎮</div>
              <h2 className="text-3xl font-bold text-white mb-4">
                Connect Your Wallet to Play
              </h2>
              <p className="text-gray-400 mb-8">
                Connect a Solana wallet to start playing games with real SOL wagers
              </p>
              <WalletMultiButton className="!bg-teal-600 !hover:bg-teal-700 !text-lg !py-4 !px-8" />
            </div>
          </div>
        ) : (
          <div className="max-w-6xl mx-auto">
            <h2 className="text-3xl font-bold text-white mb-8 text-center">
              Choose Your Game
            </h2>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {games.map((game) => (
                <div key={game.name}>
                  {game.available ? (
                    <Link href={game.href}>
                      <div className="bg-gray-800 hover:bg-gray-750 border border-gray-700 hover:border-teal-500 rounded-lg p-8 text-center transition-all cursor-pointer group">
                        <div className="text-6xl mb-4 group-hover:scale-110 transition-transform">
                          {game.emoji}
                        </div>
                        <h3 className="text-2xl font-bold text-white mb-2">
                          {game.name}
                        </h3>
                        <p className="text-gray-400 text-sm mb-4">
                          {game.description}
                        </p>
                        <div className="inline-block px-4 py-2 bg-teal-600 group-hover:bg-teal-700 rounded-full text-white font-medium text-sm">
                          Play Now →
                        </div>
                      </div>
                    </Link>
                  ) : (
                    <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-8 text-center opacity-50 cursor-not-allowed">
                      <div className="text-6xl mb-4 grayscale">{game.emoji}</div>
                      <h3 className="text-2xl font-bold text-white mb-2">
                        {game.name}
                      </h3>
                      <p className="text-gray-400 text-sm mb-4">
                        {game.description}
                      </p>
                      <div className="inline-block px-4 py-2 bg-gray-700 rounded-full text-gray-500 font-medium text-sm">
                        Coming Soon
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Stats Section */}
            <div className="mt-16 grid md:grid-cols-3 gap-6">
              <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-6 text-center">
                <div className="text-3xl font-bold text-teal-400 mb-2">97%</div>
                <div className="text-gray-400">Winner Payout</div>
              </div>
              <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-6 text-center">
                <div className="text-3xl font-bold text-teal-400 mb-2">3%</div>
                <div className="text-gray-400">House Fee</div>
              </div>
              <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-6 text-center">
                <div className="text-3xl font-bold text-teal-400 mb-2">Instant</div>
                <div className="text-gray-400">Payouts</div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="container mx-auto px-4 py-8 mt-16 border-t border-gray-800">
        <div className="text-center text-gray-500 text-sm">
          <p className="mb-2">
            Powered by Solana • Built with Anchor • Secured by smart contracts
          </p>
          <p>
            <a
              href="https://github.com/skinnyloc/solplay-escrow"
              target="_blank"
              rel="noopener noreferrer"
              className="text-teal-400 hover:underline"
            >
              View on GitHub
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
}
