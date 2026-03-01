const CloudConvert = require('cloudconvert');

// We use an Environment Variable for the API Key for security
const cloudConvert = new CloudConvert(process.env.CLOUDCONVERT_API_KEY);

module.exports = async (req, res) => {
    // Enable CORS so your Blogger site can access this
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { fileBase64, fileName } = req.body;

        if (!fileBase64) {
            return res.status(400).json({ error: 'No file data provided' });
        }

        // 1. Create a conversion job
        const job = await cloudConvert.jobs.create({
            tasks: {
                'import-file': {
                    operation: 'import/base64',
                    file: fileBase64,
                    filename: fileName
                },
                'convert-file': {
                    operation: 'convert',
                    input: 'import-file',
                    output_format: 'pdf',
                    engine: 'office', // Critical for 1:1 MS Word fidelity
                    optimize_print: true
                },
                'export-file': {
                    operation: 'export/url',
                    input: 'convert-file'
                }
            }
        });

        // 2. Wait for the job to finish
        const finishedJob = await cloudConvert.jobs.wait(job.id);
        const exportTask = finishedJob.tasks.find(task => task.name === 'export-file');
        
        // 3. Return the perfect PDF URL
        const pdfUrl = exportTask.result.files[0].url;
        res.status(200).json({ url: pdfUrl });

    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: error.message });
    }
};
