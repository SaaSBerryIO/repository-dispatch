const express = require('express');
const axios = require('axios');
const bodyParser = require('body-parser');

const app = express();
const PORT = 8000;

// Middleware to parse JSON payloads
app.use(bodyParser.json());

// GitHub token for authentication
const GITHUB_TOKEN = process.env.ORG_ACCESS_TOKEN;
const PREMIUM_REPOS = ["premium-repo", "another-repo", "third-repo"]; // Define premium repos here

// Function to send a request to GitHub's API to add a collaborator
async function addCollaborator(repo, username, permission) {
  try {
    const url = `https://api.github.com/repos/SaaSBerryIO/${repo}/collaborators/${username}`;
    await axios.put(
        url,
        { permission },
        {
          headers: {
            Accept: 'application/vnd.github+json',
            Authorization: `Bearer ${GITHUB_TOKEN}`,
            'X-GitHub-Api-Version': '2022-11-28',
          },
        }
    );
    console.log(`Successfully added ${username} to ${repo} with ${permission} permission.`);
  } catch (error) {
    console.error(`Failed to add ${username} to ${repo}:`, error.message);
  }
}

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Get token from Bearer

  if (!token || token !== process.env.WEBHOOK_TOKEN) {
    return res.status(403).json({ message: 'Forbidden: Invalid token' });
  }

  next();
}

// Webhook endpoint to handle GitHub events
app.post('/webhook', async (req, res) => {
  console.log('Received payload:', req.body);
  const { github_username, line_items } = req.body.client_payload;

  if (!github_username || !line_items) {
    return res.status(400).send('Invalid payload');
  }

  try {
    // Loop through line items and assign access based on subscription type
    for (const item of line_items) {
      if (item.name === 'Basic Module') {
        // Grant access to the basic repository
        await addCollaborator('fe-framework', github_username, 'pull');
      } else if (item.name === 'Premium Module') {
        // Grant access to each premium repository
        for (const repo of PREMIUM_REPOS) {
          await addCollaborator(repo, github_username, 'pull');
        }
      } else {
        console.log(`Unknown item name: ${item.name}`);
      }
    }

    res.status(200).send('Access updated successfully');
  } catch (error) {
    console.error('Error handling webhook:', error.message);
    res.status(500).send('Internal Server Error');
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on port:${PORT}`);
});
