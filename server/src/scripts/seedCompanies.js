import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import { connectDb } from "../db.js";
import { Company } from "../models/Company.js";

const DEFAULT_COMPANIES = [
  {
    name: "INEGI",
    password: "Jornadas2026",
    websiteUrl: "https://www.inegi.pt/pt/",
    logoUrl: "https://ani.pt/wp-content/uploads/2024/03/INEGI_00238_15-G02Q49_00-logo-inegi-slogan.png"
  },
  {
    name: "Tlantic",
    password: "Jornadas2026",
    websiteUrl: "https://www.tlantic.com/",
    logoUrl: "https://www.isep.ipp.pt/images/JES_IX/tlantic.png"
  },
  {
    name: "Glintt Global",
    password: "Jornadas2026",
    websiteUrl: "https://glinttglobal.com/en/",
    logoUrl: "https://cotecportugal.pt/wp-content/uploads/2020/01/GG_logoV_WM_NAVY_RGB_ASS.png"
  },
  {
    name: "Delloite",
    password: "Jornadas2026",
    websiteUrl: "https://www.deloitte.com/pt/pt.html",
    logoUrl: "https://cotecportugal.pt/wp-content/uploads/2020/01/DEL_PRI_RGB.png"
  },
  {
    name: "Mecwide SA",
    password: "Jornadas2026",
    websiteUrl: "https://mecwide.com/en/",
    logoUrl: "https://mecwide.com/wp-content/uploads/2021/03/logo-mecwide-300x79.png"
  },
  {
    name: "Liderteam",
    password: "Jornadas2026",
    websiteUrl: "https://liderteam.pt/",
    logoUrl: "https://liderteam.pt/cdn/shop/files/Liderteam-_-Consultoria-em-Transformacao-Digital-e-ERP-em-Portugal.png?v=1766063671"
  },
  {
    name: "Magma Studio",
    password: "Jornadas2026",
    websiteUrl: "https://magmastudio.pt/",
    logoUrl: "https://dea5b2334916f855a643cc527c4195c5.cdn.bubble.io/cdn-cgi/image/w=192,h=66,f=auto,dpr=2.5,fit=contain/f1719930076881x451326819894253300/magma-logo%20%282%29.png"
  },
  {
    name: "Optimizer",
    password: "Jornadas2026",
    websiteUrl: "https://optimizer.pt/pt-pt/",
    logoUrl: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAKQAAACUCAMAAAAqEXLeAAAAqFBMVEX///8fHx9bcvT///3+/f9ecfFecfT///t9fX0RERFZcvcODg7K0vD8///W4v2BgYFsfN1WadRdc+2ioqKKiooCAgLl7f9bb+Z5iMwZGRlISEjt7e2Gle7Q2v9+hcz///ddcPzJz/Tz9P6Un91retRteuZqcsFzes9WYcpZduxZa9F/huPa3v9cbd2wtemHl+V2hNLW1tZYWFhwcHB9hbtSZcOVlZVjY2MRyre8AAAEVklEQVR4nO2aDVvaMBCAs6RpXDRMM7GbOotON3GwOff1///Z7i5Fi1AtJWn3ca8QHnmgeXv5oL1ECIZhGIZhGIZhVlFq+yPQIbLtXRprMEZlGVXggE5HKI2gQ8Bj6zNuqMIYqAFeICKuUx3VacJLKkmwVFRRCWA9VNOjQogn3oEmECGepltTtJGkLqWqnqXAGR61wiyK1bfDP6TpnKJIpgMPnwXI+SnMyjs0YtBSLTp3EqBmHDQqu3fdEBp+2OIqmSWMGhfY6jBOKBzmkaQegQPTHe0B53tbcH6+d2FSSWJPUkfvLy8v96+u9rtzdfVh5FQaSYXTpJt9LIqpnEwmcnNynUvppc2vR6lmIEFDcnapNUhq3UFS2snEYnGQTjLDTvluP5dTaTtKWis9SN6gZLqB42b7ufUomXcAzsxPvbUgKVJNQS5E0spOYYQ+medSw+lpkEw2m8NPBUh6CTVBu3WxhAbPtfYHo2SBZEmWZEmWZEmWZMl78AYRJHULP7wmkxak+o+kgFtFugp6No545a5Xr957am43+5QHCd2Mx2B7D5fwfgBJuGWefZwX88L7opn5fL4oiv4lM7ixv/h8evrltAXhQ1PduyRYuoujTbj1/UpilgTTI845Y8rVTM9yxgd6BmY63hS9RxJzkyGDSnnK9SiYquBsygw/OoCkqaU/VUgF1gsRCpxPMaeLp3PWc3MLTNHCswTVUtFteHUvXhXioRD4CTeEJCb+sFuazCySa42gJJxM/5Ihs48t/nQ2mTKoBqNpXN+jW1DNlJzHSDbkzMMaCDY/TVi38QfOM18kSUWZWicWw0SI2pihtR4yxOwWnEp0yazq9M2oxQKMEvVhUhszAPgbQflqNcQU1A5HAwwj+l9LbnuC9P2/IJJJJeFrX3ci8DpxJO92X27NeCex5PHbF1uz+4olWZIlWZIlWZIlWZIlWZIl/wzJsBFNUX7SSvzDR1g4kSTphpcMCRuUPPO2xuRBsvvm22/j8e64NS8bJV21MvU4P0nLPyB5M3KUZe3EyetNuGuSpHSwoSTmWSFrCzx5eGIky86SG3Rn+OThuEGyVOQYJPWSJEUTJV235q52LbfncG17YySNUGVZSdZ3WFmr7yV7yrMc7j4tqdzKwJnQbrU5bgNLudu8jaQyYVfsQhLnnlDY3E6kLm5GWcpNva0kcSbHwROae3lxFKIp/fVMDC+JExDtEXRv5vXV2+l0qiGaOAWptNu420gilJn+XpfUvvAafheLHzBwhpYUlSTMMp8P6ovOZFrMb26Pku3Yby2JY0bRmq66WLs/Gn5w0u0zbytpwlbqsnSivrGfvqVoMSjhZviWkovepsw6E1piwbXcYSX/JFgyFiwZC5aMBUvGgiVjwZKxYMlYsGQsWDIWLBkLlowFS8aCJWPBkrFgyViwZCx+jt+uYXw4tNcSX38dr+HuZGivZU7WMrTVEk2Z+aF3uf8jcBgZhmEYJgm/Afh/pSZoR+SVAAAAAElFTkSuQmCC"
  },
  {
    name: "Bindtuning",
    password: "Jornadas2026",
    websiteUrl: "https://bindtuning.com/",
    logoUrl: "https://cf.bindtuning.com/images/btlogo_black.png"
  },
  {
    name: "Pontual IT",
    password: "Jornadas2026",
    websiteUrl: "https://pontualsolutions.com/",
    logoUrl: "https://pontualsolutions.com/wp-content/uploads/2023/09/pontual-it-business-solutions-logo.png"
  },
  {
    name: "Sonae Arauco",
    password: "Jornadas2026",
    websiteUrl: "https://www.sonaearauco.com/",
    logoUrl: "https://circulareconomy.europa.eu/platform/sites/default/files/styles/large/public/sonae_arauco_logo.png?itok=zxU-rRsf"
  },
  {
    name: "Accenture",
    password: "Jornadas2026",
    websiteUrl: "https://www.accenture.com/pt-pt",
    logoUrl: "https://www.ansys.com/content/dam/web/partners/accenture-logo-black-purple-rgb.png"
  },
  {
    name: "Devscope",
    password: "Jornadas2026",
    websiteUrl: "https://devscope.com/",
    logoUrl: "https://www.quasinfalivel.pt/wp-content/uploads/2021/01/devscope_logo-2.png"
  },
  {
    name: "Sogrape",
    password: "Jornadas2026",
    websiteUrl: "https://www.sogrape.pt/",
    logoUrl: "https://cotecportugal.pt/wp-content/uploads/2020/01/Sogrape_main_cmyk_pos-1200x675.png"
  }
];

async function upsertCompany(companyInput) {
  const name = String(companyInput.name || "").trim();
  const password = String(companyInput.password || "").trim();
  const websiteUrl = String(companyInput.websiteUrl || "").trim();
  const logoUrl = String(companyInput.logoUrl || "").trim();

  if (!name || password.length < 8) {
    throw new Error(`Dados inválidos para empresa: ${JSON.stringify(companyInput)}`);
  }

  const lookupFilter = websiteUrl ? { websiteUrl } : { name };

  const existing = await Company.findOne(lookupFilter);

  const passwordHash = await bcrypt.hash(password, 10);

  const setPayload = {
    name,
    websiteUrl,
    logoUrl,
    isDefaultLogin: true,
    passwordHash,
    active: true
  };

  const company = await Company.findOneAndUpdate(
    existing ? { _id: existing._id } : lookupFilter,
    {
      $set: {
        ...setPayload
      }
    },
    { new: true, upsert: true }
  );

  return company;
}

async function run() {
  await connectDb();

  for (const companyInput of DEFAULT_COMPANIES) {
    const company = await upsertCompany(companyInput);
    // eslint-disable-next-line no-console
    console.log(`Empresa pronta: ${company.name}`);
  }

  // eslint-disable-next-line no-console
  console.log("Seed de empresas concluído.");
  await mongoose.connection.close();
}

run().catch(async (error) => {
  // eslint-disable-next-line no-console
  console.error("Falha no seed de empresas", error);
  await mongoose.connection.close();
  process.exit(1);
});
