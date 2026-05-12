#!/bin/bash
cd "c:\Users\LOKI\OneDrive\Desktop\Dechta-main\Dechta-main\DechtaService-main\backend"
echo "Running database diagnostics..."
node db-diagnostics.js
echo ""
echo "Generating comprehensive report..."
node generate-report.js
