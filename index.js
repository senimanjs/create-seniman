#!/usr/bin/env node
import axios from 'axios';
import fs from 'fs/promises';
import path from 'path';
import inquirer from 'inquirer';

// GitHub API URL for the folders
const apiUrl = 'https://api.github.com/repos/senimanjs/seniman/contents/examples';

async function fetchDirectoryContents(githubPath) {
  try {
    const response = await axios.get(githubPath);
    return response.data;
  } catch (error) {
    console.error('Error fetching directory contents:', error);
    process.exit(1);
  }
}

async function downloadFile(fileUrl, filePath) {
  try {
    const response = await axios.get(fileUrl, { responseType: 'arraybuffer' });
    await fs.writeFile(filePath, response.data);
    console.log(`Downloaded ${filePath}`);
  } catch (error) {
    console.error(`Error downloading file: ${fileUrl}`, error);
  }
}

async function cloneDirectoryRecursive(githubPath, localPath) {
  const contents = await fetchDirectoryContents(githubPath);
  await fs.mkdir(localPath, { recursive: true });

  for (let item of contents) {
    const itemLocalPath = path.join(localPath, item.name);

    if (item.type === 'file') {
      await downloadFile(item.download_url, itemLocalPath);
    } else if (item.type === 'dir') {
      await cloneDirectoryRecursive(item.url, itemLocalPath);
    }
  }
}

// Clone the selected directory
async function cloneDirectory(directory, targetFolder) {
  const githubPath = `${apiUrl}/${directory}`;
  await cloneDirectoryRecursive(githubPath, targetFolder);
}

async function fetchDirectoryNames() {
  try {
    const response = await axios.get(apiUrl);
    return response.data.filter(item => item.type === 'dir').map(dir => dir.name);
  } catch (error) {
    console.error('Error fetching directory names:', error);
    process.exit(1);
  }
}

async function main() {
  console.log('\x1b[1mcreate-seniman\x1b[0m');
  console.log('Loading Seniman example apps from https://github.com/senimanjs/seniman/tree/main/examples ...');
  console.log('========');

  try {
    let directories = await fetchDirectoryNames();

    // Important apps to surface
    const importantOptions = ['hello-world', 'counter', 'routing-basic', 'login-basic', 'mini-ecommerce'];

    // Filter out the important options and add them to the beginning
    directories = importantOptions
      .filter(option => directories.includes(option))
      .concat(new inquirer.Separator('------------'))
      .concat(directories.filter(option => !importantOptions.includes(option)));

    const appSelection = await inquirer.prompt([
      {
        type: 'list',
        name: 'selectedApp',
        message: 'Choose an example app to clone:',
        choices: directories,
        pageSize: 15
      }
    ]);

    const folderSelection = await inquirer.prompt([
      {
        type: 'input',
        name: 'targetFolder',
        message: 'Enter the target folder name:',
        default: appSelection.selectedApp
      }
    ]);

    const targetFolder = folderSelection.targetFolder;

    // Check if the folder already exists
    try {
      await fs.access(targetFolder);
      // If the folder exists, throw an error
      throw new Error(`Folder "${targetFolder}" already exists. Please choose a different name.`);
    } catch {
      // Folder does not exist, proceed with cloning
      console.log(`Cloning from https://github.com/senimanjs/seniman/tree/main/examples/${appSelection.selectedApp}`);
      await cloneDirectory(appSelection.selectedApp, targetFolder);
      console.log(`Successfully cloned ${appSelection.selectedApp} into ${targetFolder}`);
    }
  } catch (error) {
    console.error('An error occurred:', error.message);
    process.exit(1);
  }
}

main();
