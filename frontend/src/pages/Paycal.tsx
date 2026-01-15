import React from 'react';

const Paycal: React.FC = () => {
  return (
    <div className="h-full w-full">
      <iframe 
        src="/paycal/paycal.html"
        className="w-full h-full border-0"
        title="Prize Pool Calculator"
        style={{ minHeight: 'calc(100vh - 64px)' }}
      />
    </div>
  );
};

export default Paycal;
