const colors = {
  must: 'bg-red-100 text-red-700',
  nice: 'bg-green-100 text-green-700',
  technical: 'bg-blue-100 text-blue-700',
  behavioural: 'bg-purple-100 text-purple-700',
  domain: 'bg-orange-100 text-orange-700',
  'system-design': 'bg-indigo-100 text-indigo-700',
  'company-fit': 'bg-pink-100 text-pink-700',
  generating: 'bg-yellow-100 text-yellow-700',
  done: 'bg-green-100 text-green-700',
  failed: 'bg-red-100 text-red-700',
  pending: 'bg-gray-100 text-gray-700',
};

export default function Badge({ children, variant = 'technical' }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${colors[variant] || 'bg-gray-100 text-gray-700'}`}>
      {children}
    </span>
  );
}
