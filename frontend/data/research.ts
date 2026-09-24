export type Publication = {
  slug: string;
  title: string;
  venue: string;
  authors: string[];
  supervisor: string;
  doi: string;
  doiUrl: string;
  description: string;
  image: string;
};

export const research: Publication[] = [
  {
    slug: "xgboost-shap-passenger-flow",
    title: "XGBoost with SHAP-based Explainable AI for Cross-Border Passenger Flow Forecasting in Hong Kong",
    venue: "IEEE ICOSAAS 2026",
    authors: ["Vincent Teo", "Jayden Foo", "Elvan Sea", "Lai Xiao Chun", "Wong Yu En"],
    supervisor: "Ts. Dr. Maythem Kamal Abbas Al-Adilee",
    doi: "10.1109/ICOSAAS68663.2026.11648824",
    doiUrl: "https://doi.org/10.1109/ICOSAAS68663.2026.11648824",
    description:
      "A published paper on forecasting cross-border passenger flow with XGBoost, with SHAP values layered " +
      "on top to explain which features actually drive each prediction — turning a black-box gradient-boosted " +
      "model into something transport planners can audit and trust.",
    image: "/projects/placeholder.svg",
  },
];
