import * as path from 'path';
import fs from 'fs'
import fse from 'fs-extra'
import git from 'isomorphic-git'
import fetch, { Blob, FormData } from "node-fetch";

import { gitAddAll, gitAdd, gitCommit, gitCloneProject } from './git.mjs'
import { compile_project } from './get_compile.mjs'

const REPOSITORIES_PATH = process.env.REPOSITORIES_PATH
const INTERKIT_BUNDLER_URL = process.env.INTERKIT_BUNDLER_URL
const INTERKIT_SERVER_WEBSOCKETS_URL = process.env.INTERKIT_SERVER_WEBSOCKETS_URL
const INTERKIT_SERVER_URL = process.env.INTERKIT_SERVER_URL
const INTERKIT_ADMIN_URL = process.env.INTERKIT_ADMIN_URL

function getProjectPath(projectId) {
  const projectPath = path.join(REPOSITORIES_PATH, "projects", projectId)
  return projectPath
}

function getThemesPath() {
  const themesPath = path.join(REPOSITORIES_PATH, "themes")
  return themesPath
}

function getProjectsPath() {
  const projectsPath = path.join(REPOSITORIES_PATH, "projects")
  return projectsPath
}

// check if folders exist to for all projects and setup starter if they don't
async function ensureRepositories(projects) {
  //console.log("ensureRepositories", projects)
  for (let project of projects) {
    const projectId = project.id
    const projectPath = getProjectPath(projectId)
    if (!fs.existsSync(projectPath)) {
      // find source project id if this project duplicates an existing project
      const projectHistoryCreateEvents = project.history && Array.isArray(project.history) && project.history.filter(e => e.event === "create_project") || []
      const lastCreateEvent = projectHistoryCreateEvents[projectHistoryCreateEvents.length-1] || {}
      const sourceProjectId = lastCreateEvent?.props?.sourceProjectId
      const template = lastCreateEvent?.props?.template
      const gitRepository = lastCreateEvent?.props?.gitRepository
      if (sourceProjectId) {
        await duplicateRepository(project, sourceProjectId)
      } else {
        await setupNewRepository(project, template, gitRepository)
      }
    } else if (!fs.existsSync(path.join(projectPath, '.git'))) {
      // A project committed inside the parent Interkit repository has no nested
      // .git directory after cloning. Initialize its local editing history.
      await git.init({ fs, dir: projectPath });
      await gitAddAll(projectPath);
      await gitCommit(projectPath, 'Initial imported project');
    }
  }
}

function generateInterkitConfig(project) {
  return {
    project_slug: project.slug || "",
    bundle_version: "0.1",
    INTERKIT_APP_LOAD_THEME: true,
    INTERKIT_BUNDLER_URL,
    INTERKIT_SERVER_WEBSOCKETS_URL,
    INTERKIT_SERVER_URL,
    INTERKIT_ADMIN_URL,
  }
}

async function duplicateRepository(project, sourceProjectId) {
  const projectId = project.id
  const oldProjectPath = getProjectPath(sourceProjectId)
  const projectPath = getProjectPath(projectId)

  console.log(`duplicating project ${oldProjectPath} to ${projectPath}`)

  if (fs.existsSync(projectPath)) {
    console.warn("path already exists", projectPath)
    return
  }

  if (!fs.existsSync(oldProjectPath)) {
    console.warn("path noes not exist", oldProjectPath)
    return
  }

  // copy files

  try {
    fse.copySync(oldProjectPath, projectPath)
    console.log(`copied ${oldProjectPath} to ${projectPath}`)
  } catch (err) {
    console.warn(`copy failed: ${oldProjectPath} to ${projectPath}`)
    return
  }

  // adjust slug

  // generate new interkit.config (TODO: modify existing config) to connect with new project slug
  const interkitConfigJson = JSON.stringify(generateInterkitConfig(project), null, "  ")
  // ...and overwrite interkit.config
  await fs.promises.writeFile(
    path.join(projectPath, "static/interkit.config.json"),
    interkitConfigJson
  )
  // ...and commit
  await gitAdd(projectPath, "static/interkit.config.json")
  await gitCommit(projectPath, "generate new interkit.config.json because of project duplication")

}

async function setupNewRepository(project, template, gitRepository) {
  const projectId = project.id
  
  const starterPath = process.env.REPOSITORIES_PATH + "/starters/starter"
  const templatePath = process.env.REPOSITORIES_PATH + "/starters/" + template
  const projectPath = getProjectPath(projectId)
  const interkitConfigJson = JSON.stringify(generateInterkitConfig(project), null, "  ")

  console.log(`setup new project ${projectId} in ${projectPath}. \n ${interkitConfigJson}`)


  // create new directory and initialize repo
  try {
    if (!fs.existsSync(projectPath)) {
      await fs.promises.mkdir(projectPath);

      if (gitRepository) {
        console.log("clone new app from " + gitRepository)
        try {
          await gitCloneProject(projectPath, gitRepository);
          
          // import seed data and mediafiles, if available
          const seedDataPath = path.join(projectPath, "/seed.zip");
          if (fs.existsSync(seedDataPath)) {
            console.log("importing seed data from " + seedDataPath)

            const zipBuffer = fs.readFileSync(
              seedDataPath
            );
            const blob = new Blob([zipBuffer], {
              type: "application/zip",
            });
            const formData = new FormData();
            formData.append("projectId", projectId);
            formData.append("importfile", blob);
            const res = await fetch(INTERKIT_SERVER_URL + "/import", {
              method: "POST",
              body: formData,
            });
            console.log("seed data import status code: " + res.status);
          }

        } catch (err) {
          console.error(err)
        }
      } else {
        // new project creation
        await git.init({ fs, dir: projectPath });
        
        fse.copySync(starterPath, projectPath) // copy starter
        if(template) {
          fse.copySync(templatePath, projectPath) // copy individual files from template into new project
        }
      
      }

      
      
      await fs.promises.writeFile(
        path.join(projectPath, "static/interkit.config.json"),
        interkitConfigJson
      )

      await gitAddAll(projectPath)

      let sha = await git.commit({
        fs,
        dir: projectPath,
        author: {
          name: 'Interkit System',
          email: 'info@interkit.app',
        },
        message: 'Initial commit'
      })
      console.log(`initial commit: ${sha}`)

      await compile_project(projectId)

    } else {
      console.log("Directory already exists.");
    }
  } catch (err) {
    console.log(err);
  }
}

export {
  ensureRepositories,
  getProjectPath,
  getThemesPath,
  getProjectsPath,
  generateInterkitConfig
}
