import { useQuery } from "@tanstack/react-query";
import { employerApi } from "@/api/employer";
import { qk } from "@/api/keys";

export const useCompany = () => useQuery({ queryKey: qk.employer.company, queryFn: employerApi.company });
