import GraphVisualization from '../GraphVisualization';

export default function GraphVisualizationExample() {
  const mockAccounts = [
    { name: "Compte Courant", balance: 125400, type: 'asset' as const },
    { name: "Chiffre d'Affaires", balance: 240000, type: 'revenue' as const },
    { name: "Charges Sociales", balance: -45600, type: 'tax' as const },
    { name: "TVA à Payer", balance: -12800, type: 'tax' as const },
    { name: "Frais Généraux", balance: -28400, type: 'expense' as const },
  ];

  return <GraphVisualization accounts={mockAccounts} />;
}