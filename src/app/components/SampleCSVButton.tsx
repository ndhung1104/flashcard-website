import { Download } from 'lucide-react';
import { Button } from './ui/button';

export function SampleCSVButton() {
  const downloadSampleCSV = () => {
    const csvContent = `term,meaning,tags
Hola,Hello,spanish;greetings
Gracias,Thank you,spanish;greetings
Adiós,Goodbye,spanish;greetings
¿Cómo estás?,How are you?,spanish;questions
Buenos días,Good morning,spanish;greetings
De nada,You're welcome,spanish;greetings`;

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', 'flashcards-sample.csv');
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Button onClick={downloadSampleCSV} variant="ghost" size="sm" className="text-xs">
      <Download className="w-3 h-3 mr-1" />
      Download Sample CSV
    </Button>
  );
}