import React from 'react';

const Paycal: React.FC = () => {
  return (
    <div className="h-full w-full flex justify-center">
      <iframe 
        src="/paycal/paycal.html"
        className="border-0"
        title="Prize Pool Calculator"
        style={{ minHeight: 'calc(100vh - 64px)', width: '1400px', maxWidth: '100%' }}
      />
    </div>
  );
};

export default Paycal;
